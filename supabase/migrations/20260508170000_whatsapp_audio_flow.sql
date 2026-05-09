-- WhatsApp audio transcription and pending confirmation flow

alter table public.whatsapp_message_log
  add column if not exists message_type text not null default 'text',
  add column if not exists media_id text,
  add column if not exists transcript text,
  add column if not exists transcription_model text,
  add column if not exists transcription_status text,
  add column if not exists transcription_error text,
  add column if not exists family_id uuid references public.families(id) on delete set null,
  add column if not exists user_id uuid references public.users(id) on delete set null;

create index if not exists idx_whatsapp_message_log_family_created
  on public.whatsapp_message_log (family_id, created_at desc);

create table if not exists public.pending_whatsapp_actions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  phone text not null,
  source_message_id text not null references public.whatsapp_message_log(message_id) on delete cascade,
  transcript text not null,
  action_type text not null check (action_type in ('record', 'edit', 'delete')),
  payload jsonb not null,
  summary_text text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  rejected_at timestamptz
);

create index if not exists idx_pending_whatsapp_actions_lookup
  on public.pending_whatsapp_actions (family_id, phone, status, created_at desc);

create unique index if not exists idx_pending_whatsapp_actions_source_message
  on public.pending_whatsapp_actions (source_message_id);

alter table public.pending_whatsapp_actions enable row level security;

drop policy if exists "pending_whatsapp_actions_deny_clients" on public.pending_whatsapp_actions;
create policy "pending_whatsapp_actions_deny_clients"
  on public.pending_whatsapp_actions
  for all
  using (false)
  with check (false);

alter table public.usage_counters
  add column if not exists audio_messages int not null default 0;
