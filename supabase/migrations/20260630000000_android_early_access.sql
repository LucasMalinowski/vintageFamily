create table if not exists android_early_access (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  constraint android_early_access_email_unique unique (email),
  constraint android_early_access_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

alter table android_early_access enable row level security;
