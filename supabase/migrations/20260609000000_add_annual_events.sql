create table annual_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  description text not null,
  category_id uuid references categories(id) on delete set null,
  category_name text,
  typical_month int not null check (typical_month between 1 and 12),
  typical_amount_cents int not null,
  is_active boolean not null default true,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index on annual_events (family_id, typical_month);
