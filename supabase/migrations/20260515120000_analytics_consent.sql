-- Add analytics_consent column to store cross-platform cookie preference.
-- null = no preference set, true = accepted, false = rejected.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS analytics_consent boolean;
