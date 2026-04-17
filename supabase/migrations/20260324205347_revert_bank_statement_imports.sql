drop policy if exists "bank_statement_import_batches_family"
  on public.bank_statement_import_batches;

drop index if exists public.idx_expenses_family_import_hash;
drop index if exists public.idx_incomes_family_import_hash;
drop index if exists public.idx_expenses_import_batch_id;
drop index if exists public.idx_incomes_import_batch_id;
drop index if exists public.idx_bank_statement_import_batches_family_bank;
drop index if exists public.idx_bank_statement_import_batches_family_created_at;

alter table public.expenses
  drop column if exists low_confidence,
  drop column if exists import_hash,
  drop column if exists raw_payload,
  drop column if exists raw_line,
  drop column if exists raw_description,
  drop column if exists import_batch_id,
  drop column if exists imported_at,
  drop column if exists source_bank,
  drop column if exists source_type,
  drop column if exists source;

alter table public.incomes
  drop column if exists low_confidence,
  drop column if exists import_hash,
  drop column if exists raw_payload,
  drop column if exists raw_line,
  drop column if exists raw_description,
  drop column if exists import_batch_id,
  drop column if exists imported_at,
  drop column if exists source_bank,
  drop column if exists source_type,
  drop column if exists source;

drop table if exists public.bank_statement_import_batches;
