-- Billing system schema and policies

alter table public.users
  add column if not exists super_admin boolean not null default false;

create table if not exists public.plan_settings (
  id uuid primary key default gen_random_uuid(),
  plan_code text unique not null check (plan_code in ('standard_monthly', 'standard_yearly', 'founders_yearly')),
  is_visible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.founders_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  plan_code text,
  price_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_uniq_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  type text,
  processed_at timestamptz not null default now()
);

create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  stripe_coupon_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_plan_settings
before update on public.plan_settings
for each row
execute function public.set_updated_at();

create trigger set_updated_at_subscriptions
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create trigger set_updated_at_coupon_codes
before update on public.coupon_codes
for each row
execute function public.set_updated_at();

insert into public.plan_settings (plan_code, is_visible, is_active)
values
  ('standard_monthly', true, true),
  ('standard_yearly', true, true),
  ('founders_yearly', true, true)
on conflict (plan_code) do nothing;

alter table public.plan_settings enable row level security;
alter table public.founders_allowlist enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.coupon_codes enable row level security;

create or replace function public.is_super_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = check_user
      and u.super_admin = true
  );
$$;

revoke all on function public.is_super_admin(uuid) from public;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.is_super_admin(uuid) to service_role;

drop policy if exists "plan_settings_select_authenticated" on public.plan_settings;
create policy "plan_settings_select_authenticated"
on public.plan_settings
for select
to authenticated
using (true);

drop policy if exists "plan_settings_manage_super_admin" on public.plan_settings;
create policy "plan_settings_manage_super_admin"
on public.plan_settings
for all
to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

-- service role only tables; no authenticated policies
drop policy if exists "coupon_codes_manage_super_admin" on public.coupon_codes;
create policy "coupon_codes_manage_super_admin"
on public.coupon_codes
for all
to authenticated
using (public.is_super_admin(auth.uid()))
with check (public.is_super_admin(auth.uid()));

grant select on public.plan_settings to authenticated;
grant all on public.plan_settings to service_role;
grant all on public.founders_allowlist to service_role;
grant all on public.stripe_customers to service_role;
grant all on public.subscriptions to service_role;
grant all on public.billing_events to service_role;
grant all on public.coupon_codes to service_role;
