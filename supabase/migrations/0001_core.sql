-- CarSales AI OS — core multi-tenant schema (v1)
-- Every business table carries tenant_id; RLS restricts rows to the caller's tenant.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('owner','admin','manager','sales','f_and_i','service','inventory','web','porter','technician');
exception when duplicate_object then null; end $$;

do $$ begin
  create type vehicle_status as enum ('Available','Pending','Sold','Recon','Wholesale','Hold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_status as enum ('working','pending_approval','approved','funded','delivered','dead');
exception when duplicate_object then null; end $$;

-- ---------- tenants ----------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  legal_name text,
  tagline text,
  phone text,
  email text,
  website text,
  address jsonb not null default '{}'::jsonb,
  second_location jsonb,
  hours jsonb not null default '{}'::jsonb,
  logo_url text,
  colors jsonb not null default '{}'::jsonb,
  social jsonb not null default '{}'::jsonb,
  financing jsonb not null default '{}'::jsonb,
  disclaimers text[] not null default '{}',
  inventory_source jsonb,
  plan text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- profiles (1:1 with auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'sales',
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists profiles_tenant_idx on profiles(tenant_id);

-- helper: caller's tenant + role (SECURITY DEFINER so RLS on profiles can't recurse)
create or replace function current_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from profiles where id = auth.uid() and is_active
$$;
create or replace function current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and is_active
$$;
create or replace function has_role(variadic roles user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = any(roles) or role = 'owner' from profiles where id = auth.uid() and is_active), false)
$$;

-- auto-create profile when a user is created with tenant metadata
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, tenant_id, email, full_name, role, must_change_password)
  values (
    new.id,
    (new.raw_user_meta_data->>'tenant_id')::uuid,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'sales'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row when (new.raw_user_meta_data ? 'tenant_id') execute function handle_new_user();

-- stamp tenant_id from caller on insert, keep updated_at fresh
create or replace function stamp_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then new.tenant_id := current_tenant_id(); end if;
  return new;
end $$;
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- vehicles ----------
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  stock_number text not null,
  vin text,
  year int not null,
  make text not null,
  model text not null,
  trim text default '',
  body_style text,
  mileage int not null default 0,
  price numeric(12,2),
  cost numeric(12,2),
  exterior_color text,
  interior_color text,
  transmission text,
  drivetrain text,
  engine text,
  fuel_type text,
  mpg text,
  images text[] not null default '{}',
  source_url text,
  description text,
  features text[] not null default '{}',
  status vehicle_status not null default 'Available',
  source text,
  external_id text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, stock_number)
);
create index if not exists vehicles_tenant_idx on vehicles(tenant_id, status);
create index if not exists vehicles_vin_idx on vehicles(tenant_id, vin);

-- ---------- customers / leads / deals / tasks / appointments ----------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  first_name text not null,
  last_name text not null default '',
  phone text,
  email text,
  address jsonb,
  source text,
  notes text,
  owner_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_tenant_idx on customers(tenant_id);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  stage text not null default 'new',
  source text,
  assigned_to uuid references profiles(id),
  score int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_tenant_idx on leads(tenant_id, stage);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  salesperson_id uuid references profiles(id),
  status deal_status not null default 'working',
  sale_price numeric(12,2),
  down_payment numeric(12,2),
  trade_value numeric(12,2),
  trade_payoff numeric(12,2),
  term_months int,
  apr numeric(6,3),
  fees jsonb not null default '{}'::jsonb,
  tax_rate numeric(6,4),
  monthly_payment numeric(12,2),
  worksheet jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists deals_tenant_idx on deals(tenant_id, status);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  assigned_to uuid references profiles(id),
  title text not null,
  due_at timestamptz,
  status text not null default 'open',
  priority text default 'normal',
  related_type text,
  related_id uuid,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_tenant_idx on tasks(tenant_id, status);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  type text not null default 'test_drive',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'scheduled',
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists appointments_tenant_idx on appointments(tenant_id, starts_at);

create table if not exists audit_log (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_tenant_idx on audit_log(tenant_id, created_at desc);

-- triggers
do $$ declare t text; begin
  foreach t in array array['vehicles','customers','leads','deals','tasks','appointments','audit_log'] loop
    execute format('drop trigger if exists %I_stamp_tenant on %I', t, t);
    execute format('create trigger %I_stamp_tenant before insert on %I for each row execute function stamp_tenant()', t, t);
  end loop;
  foreach t in array array['tenants','vehicles','customers','leads','deals','tasks','appointments'] loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table appointments enable row level security;
alter table audit_log enable row level security;

-- tenants: members read their own tenant; owner/admin update it
drop policy if exists tenants_select on tenants;
create policy tenants_select on tenants for select to authenticated using (id = current_tenant_id());
drop policy if exists tenants_update on tenants;
create policy tenants_update on tenants for update to authenticated using (id = current_tenant_id() and has_role('admin')) with check (id = current_tenant_id());

-- profiles: see colleagues; edit self (limited by trigger below); owner/admin manage all in tenant
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (tenant_id = current_tenant_id());
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_update on profiles;
create policy profiles_admin_update on profiles for update to authenticated using (tenant_id = current_tenant_id() and has_role('admin')) with check (tenant_id = current_tenant_id());

-- protect privileged profile columns from self-edits
create or replace function protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = old.id and not has_role('admin') then
    if new.role is distinct from old.role or new.tenant_id is distinct from old.tenant_id or new.is_active is distinct from old.is_active then
      raise exception 'not allowed to change role/tenant/active on own profile';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect on profiles;
create trigger profiles_protect before update on profiles for each row execute function protect_profile_columns();

-- generic tenant policies for business tables
do $$ declare t text; begin
  foreach t in array array['vehicles','customers','leads','deals','tasks','appointments'] loop
    execute format('drop policy if exists %I_tenant_select on %I', t, t);
    execute format('create policy %I_tenant_select on %I for select to authenticated using (tenant_id = current_tenant_id())', t, t);
    execute format('drop policy if exists %I_tenant_insert on %I', t, t);
    execute format('create policy %I_tenant_insert on %I for insert to authenticated with check (tenant_id = current_tenant_id())', t, t);
    execute format('drop policy if exists %I_tenant_update on %I', t, t);
    execute format('create policy %I_tenant_update on %I for update to authenticated using (tenant_id = current_tenant_id()) with check (tenant_id = current_tenant_id())', t, t);
    execute format('drop policy if exists %I_tenant_delete on %I', t, t);
    execute format('create policy %I_tenant_delete on %I for delete to authenticated using (tenant_id = current_tenant_id() and has_role(''admin'',''manager''))', t, t);
  end loop;
end $$;

-- vehicles: only inventory-capable roles may write
drop policy if exists vehicles_tenant_insert on vehicles;
create policy vehicles_tenant_insert on vehicles for insert to authenticated with check (tenant_id = current_tenant_id() and has_role('admin','manager','inventory'));
drop policy if exists vehicles_tenant_update on vehicles;
create policy vehicles_tenant_update on vehicles for update to authenticated using (tenant_id = current_tenant_id() and has_role('admin','manager','inventory')) with check (tenant_id = current_tenant_id());

-- audit log: append-only, readable by admins
drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select to authenticated using (tenant_id = current_tenant_id() and has_role('admin','manager'));
drop policy if exists audit_insert on audit_log;
create policy audit_insert on audit_log for insert to authenticated with check (tenant_id = current_tenant_id());

-- ---------- RPCs ----------
-- bootstrap payload for the app after login
create or replace function me() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'tenant', to_jsonb(t)
  )
  from profiles p join tenants t on t.id = p.tenant_id
  where p.id = auth.uid() and p.is_active
$$;

-- admin: create a user inside own tenant (email + temp password); requires owner/admin
create or replace function admin_create_user(p_email text, p_password text, p_full_name text, p_role user_role default 'sales')
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid := gen_random_uuid(); tid uuid := current_tenant_id();
begin
  if not has_role('admin') then raise exception 'admin only'; end if;
  if tid is null then raise exception 'no tenant'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', lower(p_email),
    crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('tenant_id', tid, 'role', p_role, 'full_name', p_full_name, 'must_change_password', true),
    now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, lower(p_email), 'email', jsonb_build_object('sub', uid::text, 'email', lower(p_email), 'email_verified', true), now(), now(), now());
  insert into audit_log (tenant_id, user_id, action, entity, entity_id, details)
  values (tid, auth.uid(), 'create_user', 'profile', uid::text, jsonb_build_object('email', lower(p_email), 'role', p_role));
  return uid;
end $$;

create or replace function clear_must_change_password() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid()
$$;

grant execute on function me(), clear_must_change_password(), current_tenant_id(), current_role_name() to authenticated;
grant execute on function admin_create_user(text, text, text, user_role) to authenticated;
grant execute on function has_role(user_role[]) to authenticated;
