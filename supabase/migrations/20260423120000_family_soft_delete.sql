alter table families add column if not exists deleted_at timestamptz default null;
