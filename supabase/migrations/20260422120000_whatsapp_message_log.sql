CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  message_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep only last 30 days to avoid unbounded growth
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_created_at ON whatsapp_message_log (created_at);

-- Service role bypasses RLS, so no policies needed — this just blocks anon/authenticated access
ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;
