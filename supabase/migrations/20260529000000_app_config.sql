CREATE TABLE app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can read config — no secrets stored here
CREATE POLICY "Public read" ON app_config
  FOR SELECT USING (true);

INSERT INTO app_config (key, value) VALUES
  ('min_android_version', '1.1.0'),
  ('min_ios_version',     '1.1.0');
