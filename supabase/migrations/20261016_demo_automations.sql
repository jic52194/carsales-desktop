-- Demo dealership: turn every play on and seed realistic "who's in a play" activity after each build/reset.
create or replace function private.demo_automations(p_tenant uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; dealer text; a timestamptz := now() - interval '2 hours';
begin
  if not exists (select 1 from tenants where id = p_tenant and is_demo) then return; end if;
  select name into dealer from tenants where id = p_tenant;
  update tenants set automations = jsonb_build_object('plays', (select jsonb_object_agg(k, jsonb_build_object('enabled', true)) from unnest(array['new_lead','appointment','no_show','stalled_deal','lost_lead','be_back','dead_deal','aged_lead','new_arrival','sold']) k),
    'reviewLink', coalesce(nullif(automations->>'reviewLink',''), 'https://g.page/r/demo/review')) where id = p_tenant;
  -- new leads: instant text + email done, day-1 text next
  for r in select l.id, l.customer_id, l.vehicle_id, l.assigned_to, l.created_at, c.first_name, concat_ws(' ', v.year, v.make, v.model) car from leads l join customers c on c.id = l.customer_id left join vehicles v on v.id = l.vehicle_id
           where l.tenant_id = p_tenant and l.stage in ('new','contacted') order by l.created_at desc limit 4 loop
    n := n + 1;
    insert into enrollments (tenant_id, play, customer_id, lead_id, vehicle_id, owner_id, step, next_at, status, stop_reason, context, log, created_at)
    values (p_tenant, 'new_lead', r.customer_id, r.id, r.vehicle_id, r.assigned_to, case when n = 4 then 1 else 2 end, case when n = 4 then null else a + interval '1 day' end,
      case when n = 4 then 'booked' else 'active' end, case when n = 4 then 'Booked an appointment' else null end,
      jsonb_build_object('anchor_at', a, 'demo', true),
      jsonb_build_array(jsonb_build_object('step','t0','at', a + interval '20 seconds','kind','sms','result','sent','text', 'Hi ' || r.first_name || ', got your request' || coalesce(' on the ' || nullif(r.car,''), '') || '! Is it still the one you want to see? I can have it ready for a test drive today or tomorrow. Reply STOP to opt out.'))
        || case when n = 4 then '[]'::jsonb else jsonb_build_array(jsonb_build_object('step','e1','at', a + interval '1 hour','kind','email','result','sent')) end,
      a) on conflict do nothing;
  end loop;
  -- stalled deals: manager task + AI save text done
  for r in select d.id, d.customer_id, d.vehicle_id, d.salesperson_id, c.first_name, concat_ws(' ', v.year, v.make, v.model) car from deals d join customers c on c.id = d.customer_id left join vehicles v on v.id = d.vehicle_id
           where d.tenant_id = p_tenant and d.status::text in ('working','pending_approval') order by d.created_at limit 2 loop
    insert into enrollments (tenant_id, play, customer_id, deal_id, vehicle_id, owner_id, step, next_at, context, log, created_at)
    values (p_tenant, 'stalled_deal', r.customer_id, r.id, r.vehicle_id, r.salesperson_id, 2, now() + interval '2 days', jsonb_build_object('anchor_at', now() - interval '1 day', 'demo', true),
      jsonb_build_array(jsonb_build_object('step','m0','at', now() - interval '1 day','kind','task','result','task created'),
        jsonb_build_object('step','a1','at', now() - interval '22 hours','kind','ai','result','sent','text', 'Hi ' || r.first_name || ', my manager took another look at your numbers on the ' || coalesce(nullif(r.car,''),'car') || ' and we have a couple of options. Do you have 5 minutes today?')),
      now() - interval '1 day') on conflict do nothing;
  end loop;
  -- sold: thank-you done, review request next
  for r in select d.id, d.customer_id, d.vehicle_id, d.salesperson_id, c.first_name, concat_ws(' ', v.year, v.make, v.model) car from deals d join customers c on c.id = d.customer_id left join vehicles v on v.id = d.vehicle_id
           where d.tenant_id = p_tenant and d.status::text in ('funded','delivered') order by d.created_at desc limit 3 loop
    insert into enrollments (tenant_id, play, customer_id, deal_id, vehicle_id, owner_id, step, next_at, context, log, created_at)
    values (p_tenant, 'sold', r.customer_id, r.id, r.vehicle_id, r.salesperson_id, 1, now() + interval '2 days', jsonb_build_object('anchor_at', now() - interval '1 day', 'demo', true),
      jsonb_build_array(jsonb_build_object('step','t0','at', now() - interval '22 hours','kind','sms','result','sent','text', 'Congrats on your ' || coalesce(nullif(r.car,''),'new car') || ', ' || r.first_name || '! Thank you for choosing ' || dealer || '.')),
      now() - interval '1 day') on conflict do nothing;
  end loop;
  -- lost leads: manager review done; and one that replied
  n := 0;
  for r in select l.id, l.customer_id, l.vehicle_id, l.assigned_to from leads l where l.tenant_id = p_tenant and l.stage = 'lost' order by l.updated_at desc limit 2 loop
    n := n + 1;
    insert into enrollments (tenant_id, play, customer_id, lead_id, vehicle_id, owner_id, step, next_at, status, stop_reason, context, log, created_at)
    values (p_tenant, 'lost_lead', r.customer_id, r.id, r.vehicle_id, r.assigned_to, case when n = 1 then 1 else 2 end, case when n = 1 then now() + interval '1 day' else null end,
      case when n = 1 then 'active' else 'replied' end, case when n = 1 then null else 'Customer replied' end, jsonb_build_object('anchor_at', now() - interval '2 days', 'demo', true),
      jsonb_build_array(jsonb_build_object('step','m0','at', now() - interval '47 hours','kind','task','result','task created')), now() - interval '2 days') on conflict do nothing;
  end loop;
end $$;
revoke execute on function private.demo_automations(uuid) from public, anon, authenticated;

create or replace function public.demo_build_svc(p_tenant uuid, p_keep_vehicles boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; begin r := private.demo_build(p_tenant, p_keep_vehicles); perform private.demo_extras(p_tenant); perform private.demo_automations(p_tenant); return r; end $$;
