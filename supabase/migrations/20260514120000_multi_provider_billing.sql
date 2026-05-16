-- Multi-provider billing support: RevenueCat (Apple/Google) + Stripe
-- Adds provider tracking, idempotency across providers, rate limiting, and RC upsert RPC.

-- 1. billing_events: extend for multi-provider idempotency
ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe';

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS provider_event_id text;

-- Backfill from stripe_event_id
UPDATE public.billing_events
SET provider_event_id = stripe_event_id
WHERE provider_event_id IS NULL AND stripe_event_id IS NOT NULL;

-- Unique constraint per provider ensures no cross-provider collisions
CREATE UNIQUE INDEX IF NOT EXISTS billing_events_provider_event_uniq_idx
  ON public.billing_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- 2. subscriptions: track payment provider origin
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe'
  CHECK (provider IN ('stripe', 'revenuecat', 'manual'));

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

-- 3. rate_limit_counters: per-user, per-endpoint, per-minute-window
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, endpoint, window_start)
);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_counters FROM anon;
REVOKE ALL ON public.rate_limit_counters FROM authenticated;
GRANT ALL ON public.rate_limit_counters TO service_role;

-- Cleanup old windows automatically (index for efficient deletes)
CREATE INDEX IF NOT EXISTS rate_limit_counters_window_idx
  ON public.rate_limit_counters(window_start);

-- 4. upsert_subscription_from_revenuecat RPC
-- Mirrors upsert_subscription_from_stripe with event-timestamp ordering protection.
-- Uses last_stripe_event_created column as generic last_event_created (legacy name kept for schema compat).
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_revenuecat(
  p_user_id uuid,
  p_family_id uuid,
  p_revenuecat_app_user_id text,
  p_product_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_family_id IS NULL OR p_event_created IS NULL THEN
    RAISE EXCEPTION 'invalid_revenuecat_event';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    family_id,
    provider,
    revenuecat_app_user_id,
    plan_code,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    last_stripe_event_created
  ) VALUES (
    p_user_id,
    p_family_id,
    'revenuecat',
    p_revenuecat_app_user_id,
    p_product_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_event_created
  )
  ON CONFLICT (family_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    provider = EXCLUDED.provider,
    revenuecat_app_user_id = EXCLUDED.revenuecat_app_user_id,
    plan_code = EXCLUDED.plan_code,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    last_stripe_event_created = EXCLUDED.last_stripe_event_created,
    updated_at = now()
  -- Event-timestamp ordering: a later event can never be overwritten by an older one.
  -- Protects against out-of-order webhook delivery and replay attacks.
  WHERE public.subscriptions.last_stripe_event_created IS NULL
     OR public.subscriptions.last_stripe_event_created <= EXCLUDED.last_stripe_event_created;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_subscription_from_revenuecat(uuid, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_from_revenuecat(uuid, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz) TO service_role;

-- 5. check_rate_limit RPC
-- Atomically increments the counter for the current time window and returns whether the request is allowed.
-- p_window_seconds: window duration (e.g. 60 = per-minute, 3600 = per-hour)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_count integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_endpoint IS NULL OR p_max_count < 1 THEN
    RAISE EXCEPTION 'invalid_rate_limit_args';
  END IF;

  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_counters(user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, v_window, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = rate_limit_counters.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max_count;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO service_role;
