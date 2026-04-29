alter table public.incomes
  add column if not exists status text not null default 'received';

update public.incomes
set status = coalesce(status, 'received')
where status is null;

alter table public.incomes
  drop constraint if exists incomes_status_check;

alter table public.incomes
  add constraint incomes_status_check
  check (status in ('received', 'pending'));

create index if not exists idx_incomes_family_status_date
  on public.incomes (family_id, status, date desc);
