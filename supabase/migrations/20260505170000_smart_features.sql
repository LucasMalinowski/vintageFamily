-- recurring_patterns: tracks user-defined and auto-detected recurring expenses/incomes
create table if not exists public.recurring_patterns (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  description_pattern text not null,
  kind text not null default 'expense' check (kind in ('expense', 'income')),
  category_id uuid references public.categories(id) on delete set null,
  estimated_amount_cents int,
  frequency text not null default 'monthly'
    check (frequency in ('weekly','biweekly','monthly','bimonthly','quarterly','semiannual','annual')),
  source text not null default 'auto' check (source in ('auto', 'user')),
  day_of_month smallint check (day_of_month between 1 and 28),
  tolerance_days smallint not null default 5,
  last_occurrence_date date,
  next_expected_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recurring_patterns_family
  on public.recurring_patterns (family_id, is_active);

create index if not exists idx_recurring_patterns_next_date
  on public.recurring_patterns (next_expected_date)
  where is_active = true;

-- Unique constraint so detector upserts work
create unique index if not exists idx_recurring_patterns_unique
  on public.recurring_patterns (family_id, description_pattern, kind);

-- insights: stores both proactive and on-demand AI-generated insights
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  period text,
  type text not null check (type in ('proactive', 'on_demand')),
  prompt_question text,
  content text not null,
  sent_channels text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_family_created
  on public.insights (family_id, created_at desc);

create index if not exists idx_insights_family_type
  on public.insights (family_id, type, created_at desc);

-- Add billing_cycle_day to users (per-user payday, default 7th of month)
alter table public.users
  add column if not exists billing_cycle_day smallint not null default 7
    check (billing_cycle_day between 1 and 28);

-- Add insight preferences to users
alter table public.users
  add column if not exists insights_enabled boolean not null default true;

alter table public.users
  add column if not exists insight_interval_days smallint not null default 30
    check (insight_interval_days >= 3);

alter table public.users
  add column if not exists insight_channels text[] not null default array['whatsapp', 'email'];

-- Allow pending_confirmation status on expenses (for auto-launched recurring items)
alter table public.expenses
  drop constraint if exists expenses_status_check;

alter table public.expenses
  add constraint expenses_status_check
    check (status in ('open', 'paid', 'pending_confirmation'));

-- Add on_demand_insights counter to usage_counters
alter table public.usage_counters
  add column if not exists on_demand_insights int not null default 0;

-- RLS for recurring_patterns
alter table public.recurring_patterns enable row level security;

create policy "users can read their family recurring_patterns"
  on public.recurring_patterns for select
  using (family_id in (select family_id from public.users where id = auth.uid()));

create policy "users can insert their family recurring_patterns"
  on public.recurring_patterns for insert
  with check (family_id in (select family_id from public.users where id = auth.uid()));

create policy "users can update their family recurring_patterns"
  on public.recurring_patterns for update
  using (family_id in (select family_id from public.users where id = auth.uid()));

create policy "users can delete their family recurring_patterns"
  on public.recurring_patterns for delete
  using (family_id in (select family_id from public.users where id = auth.uid()));

-- RLS for insights
alter table public.insights enable row level security;

create policy "users can read their family insights"
  on public.insights for select
  using (family_id in (select family_id from public.users where id = auth.uid()));

create policy "users can insert their family insights"
  on public.insights for insert
  with check (family_id in (select family_id from public.users where id = auth.uid()));
