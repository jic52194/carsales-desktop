-- Automations engine (v3.4.0): follow-up "plays" (web/src/lib/plays.ts) run by the seq-run edge function every 5 minutes.
-- Database side: who is enrolled in which play, enroll on events, and stop instantly on reply / booking / purchase / opt-out.

-- 1) columns
alter table customers add column if not exists sms_opt_out boolean not null default false;
alter table tenants   add column if not exists automations jsonb not null default '{}'::jsonb;
alter table vehicles  add column if not exists prev_price numeric;
alter table vehicles  add column if not exists price_dropped_at timestamptz;

-- 2) enrollments
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  play text not null,
  customer_id uuid not null references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  deal_id uuid references deals(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  owner_id uuid,
  step int not null default 0,
  next_at timestamptz default now(),
  status text not null default 'active' check (status in ('active','replied','booked','completed','stopped','opted_out')),
  stop_reason text,
  context jsonb not null default '{}'::jsonb,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists enrollments_one_active on enrollments (tenant_id, play, customer_id) where status = 'active';
create index if not exists enrollments_due on enrollments (next_at) where status = 'active';
create index if not exists enrollments_tenant on enrollments (tenant_id, status, created_at desc);
create index if not exists enrollments_customer on enrollments (customer_id);
alter table enrollments enable row level security;
create policy enrollments_select on enrollments for select using (tenant_id = current_tenant_id());
create policy enrollments_update on enrollments for update using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id());
create trigger enrollments_touch before update on enrollments for each row execute function touch_updated_at();

-- 3) enroll helper (only when the dealership turned the play on)
create or replace function private.seq_enroll(p_tenant uuid, p_play text, p_customer uuid, p_ctx jsonb, p_next timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_customer is null then return; end if;
  if not coalesce((select (automations->'plays'->p_play->>'enabled')::boolean from tenants where id = p_tenant and status = 'active'), false) then return; end if;
  if exists (select 1 from customers where id = p_customer and sms_opt_out) then return; end if;
  insert into enrollments (tenant_id, play, customer_id, lead_id, deal_id, appointment_id, vehicle_id, owner_id, next_at, context)
  values (p_tenant, p_play, p_customer, nullif(p_ctx->>'lead_id','')::uuid, nullif(p_ctx->>'deal_id','')::uuid, nullif(p_ctx->>'appointment_id','')::uuid,
          nullif(p_ctx->>'vehicle_id','')::uuid, nullif(p_ctx->>'owner','')::uuid, p_next, p_ctx)
  on conflict do nothing;
end $$;

-- stop a customer's active plays (except the listed ones)
create or replace function private.seq_stop(p_tenant uuid, p_customer uuid, p_status text, p_reason text, p_keep text[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update enrollments set status = p_status, stop_reason = p_reason, next_at = null
   where tenant_id = p_tenant and customer_id = p_customer and status = 'active' and not (play = any(p_keep));
  get diagnostics n = row_count; return n;
end $$;

-- 4) event triggers
create or replace function public.seq_leads() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if from_ghl() then return new; end if;
  if tg_op = 'INSERT' then
    if new.stage in ('new','contacted') then
      perform private.seq_enroll(new.tenant_id, 'new_lead', new.customer_id, jsonb_build_object('lead_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to, 'source', new.source));
    end if;
  elsif new.stage is distinct from old.stage then
    if new.stage in ('appointment','negotiating','sold','lost') then
      update enrollments set status = 'completed', stop_reason = 'Lead moved to ' || new.stage, next_at = null where lead_id = new.id and play = 'new_lead' and status = 'active';
    end if;
    if new.stage = 'lost' then
      perform private.seq_enroll(new.tenant_id, 'lost_lead', new.customer_id, jsonb_build_object('lead_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to));
    end if;
  end if;
  return new;
end $$;
create trigger trg_seq_leads after insert or update on leads for each row execute function seq_leads();

create or replace function public.seq_appointments() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if from_ghl() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status in ('scheduled','confirmed') and new.starts_at > now() then
      perform private.seq_stop(new.tenant_id, new.customer_id, 'booked', 'Booked an appointment', array['appointment','sold']);
      perform private.seq_enroll(new.tenant_id, 'appointment', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to));
    end if;
  else
    if new.status = 'no_show' and old.status is distinct from 'no_show' then
      perform private.seq_enroll(new.tenant_id, 'no_show', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to), now() + interval '30 minutes');
    elsif new.status = 'showed' and old.status is distinct from 'showed' then
      perform private.seq_enroll(new.tenant_id, 'be_back', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to), now() + interval '20 hours');
    end if;
    if new.starts_at is distinct from old.starts_at or new.status is distinct from old.status then
      update enrollments set next_at = now() where appointment_id = new.id and status = 'active';
    end if;
  end if;
  return new;
end $$;
create trigger trg_seq_appointments after insert or update on appointments for each row execute function seq_appointments();

create or replace function public.seq_deals() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if from_ghl() then return new; end if;
  if new.status::text in ('funded','delivered') and (tg_op = 'INSERT' or old.status::text not in ('funded','delivered')) then
    perform private.seq_stop(new.tenant_id, new.customer_id, 'completed', 'Bought a car', array['sold','appointment']);
    perform private.seq_enroll(new.tenant_id, 'sold', new.customer_id, jsonb_build_object('deal_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.salesperson_id));
  elsif tg_op = 'UPDATE' and new.status::text = 'dead' and old.status::text <> 'dead' then
    update enrollments set status = 'completed', stop_reason = 'Deal marked dead', next_at = null where deal_id = new.id and play = 'stalled_deal' and status = 'active';
    perform private.seq_enroll(new.tenant_id, 'dead_deal', new.customer_id, jsonb_build_object('deal_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.salesperson_id));
  end if;
  return new;
end $$;
create trigger trg_seq_deals after insert or update on deals for each row execute function seq_deals();

-- inbound text: STOP opts out everywhere; any other reply stops the follow-up plays and puts a task on the owner's list
create or replace function public.seq_inbound() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; who text; own uuid;
begin
  if from_ghl() then return new; end if;
  if new.kind <> 'message' or new.data->>'direction' <> 'inbound' or nullif(new.data->>'customerId','') is null then return new; end if;
  if coalesce(new.data->>'channel','sms') not in ('sms','email') then return new; end if;
  if new.data->>'body' ~* '^\s*(stop|unsubscribe|cancel|end|quit|stopall|optout|opt out)\s*$' then
    update customers set sms_opt_out = true where id = (new.data->>'customerId')::uuid and tenant_id = new.tenant_id;
    perform private.seq_stop(new.tenant_id, (new.data->>'customerId')::uuid, 'opted_out', 'Replied STOP', array[]::text[]);
    return new;
  end if;
  if new.data->>'body' ~* '^\s*(start|unstop|subscribe)\s*$' then
    update customers set sms_opt_out = false where id = (new.data->>'customerId')::uuid and tenant_id = new.tenant_id;
  end if;
  select owner_id into own from enrollments where tenant_id = new.tenant_id and customer_id = (new.data->>'customerId')::uuid and status = 'active' and play not in ('appointment','sold') order by created_at desc limit 1;
  n := private.seq_stop(new.tenant_id, (new.data->>'customerId')::uuid, 'replied', 'Customer replied', array['appointment','sold']);
  if n > 0 then
    select trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) into who from customers where id = (new.data->>'customerId')::uuid;
    insert into tasks (tenant_id, assigned_to, title, due_at, status, priority, related_type, related_id, notes)
    values (new.tenant_id, coalesce(own, (select id from profiles where tenant_id = new.tenant_id and is_active and role in ('manager','admin','owner') order by case role when 'manager' then 1 when 'admin' then 2 else 3 end limit 1)),
      left('Reply to ' || coalesce(nullif(who,''),'customer') || ': "' || left(new.data->>'body', 80) || '"', 200), now(), 'open', 'high', 'customer', (new.data->>'customerId')::uuid,
      'They answered an automated follow-up, so it stopped. Text them back from the Inbox.');
  end if;
  return new;
end $$;
create trigger trg_seq_inbound after insert on records for each row execute function seq_inbound();

-- price drops (for the New arrival / price drop play)
create or replace function public.vehicles_price_drop() returns trigger language plpgsql set search_path = public as $$
begin
  if new.price is not null and old.price is not null and new.price < old.price - 1 then new.prev_price := old.price; new.price_dropped_at := now(); end if;
  return new;
end $$;
create trigger trg_vehicles_price_drop before update on vehicles for each row execute function vehicles_price_drop();

revoke execute on function private.seq_enroll(uuid,text,uuid,jsonb,timestamptz) from public, anon, authenticated;
revoke execute on function private.seq_stop(uuid,uuid,text,text,text[]) from public, anon, authenticated;

-- 5) cron: run the engine every 5 minutes
select cron.schedule('seq-run-5min', '*/5 * * * *', $$select private.call_fn('seq-run', '{"action":"tick"}'::jsonb)$$);

-- ── review fixes (same day): smarter STOP detection, no "still shopping?" plays right after a purchase,
--    one appointment play per newest appointment, be-back / no-show keep their delay, staff may only stop a play ──
create or replace function public.is_opt_out_text(p text) returns boolean language sql immutable as $$
  select n in ('stop','stopall','stop all','unsubscribe','cancel','end','quit','optout','opt out','unsub')
      or (n ~ '^(stop|unsubscribe|optout|opt out|unsub)( |$)' and n !~ '^stop by')
      or n ~ '(remove me|stop texting|stop messaging|stop contacting|wrong number|do not text|dont text|don t text|take me off)'
  from (select trim(regexp_replace(lower(coalesce(p,'')), '[^a-z]+', ' ', 'g')) n) x
$$;
create or replace function private.seq_enroll(p_tenant uuid, p_play text, p_customer uuid, p_ctx jsonb, p_next timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_customer is null then return; end if;
  if not coalesce((select (automations->'plays'->p_play->>'enabled')::boolean from tenants where id = p_tenant and status = 'active'), false) then return; end if;
  if exists (select 1 from customers where id = p_customer and tenant_id = p_tenant and sms_opt_out) then return; end if;
  if not exists (select 1 from customers where id = p_customer and tenant_id = p_tenant) then return; end if;
  if p_play not in ('sold','appointment') and exists (select 1 from deals where tenant_id = p_tenant and customer_id = p_customer and status::text in ('funded','delivered') and updated_at > now() - interval '45 days') then return; end if;
  insert into enrollments (tenant_id, play, customer_id, lead_id, deal_id, appointment_id, vehicle_id, owner_id, next_at, context)
  values (p_tenant, p_play, p_customer, nullif(p_ctx->>'lead_id','')::uuid, nullif(p_ctx->>'deal_id','')::uuid, nullif(p_ctx->>'appointment_id','')::uuid,
          nullif(p_ctx->>'vehicle_id','')::uuid, nullif(p_ctx->>'owner','')::uuid, p_next, p_ctx)
  on conflict do nothing;
end $$;

create or replace function public.seq_appointments() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if from_ghl() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status in ('scheduled','confirmed') and new.starts_at > now() then
      perform private.seq_stop(new.tenant_id, new.customer_id, 'booked', 'Booked an appointment', array['appointment','sold']);
      update enrollments set status = 'completed', stop_reason = 'A newer appointment was booked', next_at = null where tenant_id = new.tenant_id and customer_id = new.customer_id and play = 'appointment' and status = 'active';
      perform private.seq_enroll(new.tenant_id, 'appointment', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to));
    end if;
  else
    if new.starts_at is distinct from old.starts_at or new.status is distinct from old.status then
      update enrollments set next_at = now() where appointment_id = new.id and play = 'appointment' and status = 'active';
    end if;
    if new.status = 'no_show' and old.status is distinct from 'no_show' then
      perform private.seq_enroll(new.tenant_id, 'no_show', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to), now() + interval '30 minutes');
    elsif new.status = 'showed' and old.status is distinct from 'showed' then
      perform private.seq_enroll(new.tenant_id, 'be_back', new.customer_id, jsonb_build_object('appointment_id', new.id, 'vehicle_id', new.vehicle_id, 'owner', new.assigned_to), now() + interval '20 hours');
    end if;
  end if;
  return new;
end $$;

-- seq_inbound: identical to the version above except the opt-out test is `if is_opt_out_text(new.data->>'body') then`
-- with stop reason 'Asked to stop texts'.

create or replace function public.enrollments_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.status <> 'stopped' or old.status <> 'active'
     or (to_jsonb(new) - array['status','stop_reason','next_at','updated_at']) is distinct from (to_jsonb(old) - array['status','stop_reason','next_at','updated_at']) then
    raise exception 'Only stopping a running play is allowed' using errcode = '42501';
  end if;
  new.next_at := null; new.stop_reason := left(coalesce(new.stop_reason, 'Stopped by staff'), 120);
  return new;
end $$;
create trigger trg_enrollments_guard before update on enrollments for each row execute function enrollments_guard();
revoke execute on function public.seq_leads(), public.seq_appointments(), public.seq_deals(), public.seq_inbound() from public, anon, authenticated;
