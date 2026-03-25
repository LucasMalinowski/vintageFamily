alter table public.families
  add column if not exists founders_enabled boolean not null default false;
