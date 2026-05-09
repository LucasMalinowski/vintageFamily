CREATE TABLE IF NOT EXISTS web_handoff_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used        BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_handoff_tokens_token_idx ON web_handoff_tokens(token);
CREATE INDEX IF NOT EXISTS web_handoff_tokens_expires_idx ON web_handoff_tokens(expires_at);

-- RLS: this table is only ever touched by service-role key (backend), never by client JWT
ALTER TABLE web_handoff_tokens ENABLE ROW LEVEL SECURITY;
-- No policies needed — all access is via supabaseService (service role bypasses RLS)
