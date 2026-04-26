-- whatsapp_context: stores the last numbered list shown per phone for edit/delete
CREATE TABLE IF NOT EXISTS whatsapp_context (
  phone TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  context_items JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL
);

-- Service role bypasses RLS; block direct client access
ALTER TABLE whatsapp_context ENABLE ROW LEVEL SECURITY;

-- feedback: user-submitted reports from the WhatsApp bot or the web feedback form
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'feedback' CHECK (type IN ('bug', 'feedback', 'suggestion')),
  location TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public inserts go through the API route using service role; block direct client reads
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
