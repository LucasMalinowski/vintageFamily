ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS hidden_on_dashboard boolean NOT NULL DEFAULT false;

UPDATE public.reminders
SET hidden_on_dashboard = false
WHERE hidden_on_dashboard IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_family_hidden_done
  ON public.reminders USING btree (family_id, hidden_on_dashboard, is_done);
