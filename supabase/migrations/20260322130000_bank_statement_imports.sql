create table if not exists public.bank_statement_import_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source_bank text not null,
  source_type text not null default 'bank_statement_csv',
  file_name text,
  file_hash text not null,
  page_count integer not null default 0 check (page_count >= 0),
  status text not null default 'processing',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.bank_statement_import_batches enable row level security;

create policy "bank_statement_import_batches_family"
  on public.bank_statement_import_batches
  to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

alter table public.incomes
  add column if not exists source text,
  add column if not exists source_type text,
  add column if not exists source_bank text,
  add column if not exists imported_at timestamp with time zone,
  add column if not exists import_batch_id uuid references public.bank_statement_import_batches(id) on delete set null,
  add column if not exists raw_description text,
  add column if not exists raw_line text,
  add column if not exists raw_payload jsonb,
  add column if not exists import_hash text,
  add column if not exists low_confidence boolean not null default false;

alter table public.expenses
  add column if not exists source text,
  add column if not exists source_type text,
  add column if not exists source_bank text,
  add column if not exists imported_at timestamp with time zone,
  add column if not exists import_batch_id uuid references public.bank_statement_import_batches(id) on delete set null,
  add column if not exists raw_description text,
  add column if not exists raw_line text,
  add column if not exists raw_payload jsonb,
  add column if not exists import_hash text,
  add column if not exists low_confidence boolean not null default false;

create index if not exists idx_bank_statement_import_batches_family_created_at
  on public.bank_statement_import_batches (family_id, created_at desc);

create index if not exists idx_bank_statement_import_batches_family_bank
  on public.bank_statement_import_batches (family_id, source_bank);

create index if not exists idx_incomes_import_batch_id
  on public.incomes (import_batch_id);

create index if not exists idx_expenses_import_batch_id
  on public.expenses (import_batch_id);

create unique index if not exists idx_incomes_family_import_hash
  on public.incomes (family_id, import_hash)
  where import_hash is not null;

create unique index if not exists idx_expenses_family_import_hash
  on public.expenses (family_id, import_hash)
  where import_hash is not null;
