-- WhatsApp image and PDF registration support
-- The whatsapp_message_log.message_type column is plain text with no CHECK constraint,
-- so new values ('image', 'document') are accepted without schema changes.
-- This migration documents the new values and adds a partial index for media lookups.

create index if not exists idx_whatsapp_message_log_media
  on public.whatsapp_message_log (message_type, created_at desc)
  where message_type in ('image', 'document', 'audio');
