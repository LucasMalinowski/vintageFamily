-- Monthly spending limit per category (optional, family-shared).
-- Stored in cents (integer) consistent with other monetary columns.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS monthly_limit_cents integer DEFAULT NULL;

-- Allow 'limit_alert' as an insights type so threshold notifications
-- can be stored alongside proactive and on_demand insights.
ALTER TABLE public.insights
  DROP CONSTRAINT IF EXISTS insights_type_check;

ALTER TABLE public.insights
  ADD CONSTRAINT insights_type_check
    CHECK (type IN ('proactive', 'on_demand', 'limit_alert'));
