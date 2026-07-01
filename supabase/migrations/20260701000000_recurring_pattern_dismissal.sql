-- Link launched pending_confirmation expenses/incomes back to the recurring
-- pattern that created them, so the user can dismiss the pattern (not just
-- delete a single occurrence) directly from the app.
alter table public.expenses
  add column if not exists recurring_pattern_id uuid references public.recurring_patterns(id) on delete set null;

alter table public.incomes
  add column if not exists recurring_pattern_id uuid references public.recurring_patterns(id) on delete set null;

create index if not exists idx_expenses_recurring_pattern_id
  on public.expenses (recurring_pattern_id);

create index if not exists idx_incomes_recurring_pattern_id
  on public.incomes (recurring_pattern_id);

-- incomes_status_check never got the 'pending_confirmation' value that
-- expenses_status_check received in 20260505170000_smart_features.sql, so
-- launcher.ts has been silently failing to insert pending recurring incomes.
alter table public.incomes
  drop constraint if exists incomes_status_check;

alter table public.incomes
  add constraint incomes_status_check
    check (status in ('received', 'pending', 'pending_confirmation'));
