alter table public.families
  add column if not exists lifetime_access boolean not null default false;
