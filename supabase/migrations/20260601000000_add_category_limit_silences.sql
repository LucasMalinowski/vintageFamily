-- Stores per-family, per-category, per-billing-period silences for limit alerts.
-- A silence record means: "don't send push/WhatsApp alerts for this category this billing period."
-- Expires automatically when a new billing period starts (different billing_period_key).

CREATE TABLE public.category_limit_silences (
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  billing_period_key text NOT NULL, -- YYYY-MM from getCurrentBillingPeriod(billing_cycle_day)
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (family_id, category_id, billing_period_key)
);

ALTER TABLE public.category_limit_silences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can manage limit silences"
  ON public.category_limit_silences
  FOR ALL
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()))
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));
