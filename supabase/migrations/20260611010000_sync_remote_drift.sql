-- Sync drift between prod (where several migrations were pasted manually via
-- the SQL editor) and the migration files. Everything here is idempotent so it
-- is a no-op on whichever side already has the object.
-- Drift found via `supabase db diff --linked` on 2026-06-11.

-- 1. usage_counters: prod was created without the timestamp columns
alter table public.usage_counters
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2. Indexes added directly in prod (likely via the Supabase advisor) — codify
create index if not exists idx_insights_user_id_hash on public.insights using hash (user_id);
create index if not exists idx_push_tokens_user_id_hash on public.push_tokens using hash (user_id);
create index if not exists idx_savings_family_name on public.savings using btree (family_id, lower(name));
create index if not exists idx_usage_counters_family_period on public.usage_counters using btree (family_id, period);
create index if not exists idx_users_family_id_hash on public.users using hash (family_id);

-- 3. insights policies: adopt prod's safer shape — clients may only read
-- (inserts go through the API with the service role)
drop policy if exists "users can read their family insights" on public.insights;
drop policy if exists "users can insert their family insights" on public.insights;
drop policy if exists "family members can read insights" on public.insights;

create policy "family members can read insights"
  on public.insights
  for select
  to authenticated
  using (family_id in (select users.family_id from public.users where users.id = auth.uid()));

-- 4. recurring_patterns: prod has RLS enabled but NO policies (default deny),
-- so the direct client upserts from the web/mobile expense+income forms were
-- silently failing. Restore the family-scoped policies from the migration files.
drop policy if exists "users can read their family recurring_patterns" on public.recurring_patterns;
drop policy if exists "users can insert their family recurring_patterns" on public.recurring_patterns;
drop policy if exists "users can update their family recurring_patterns" on public.recurring_patterns;
drop policy if exists "users can delete their family recurring_patterns" on public.recurring_patterns;

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
