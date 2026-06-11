-- Audit fixes (2026-06-11):
-- 1. IP-keyed rate limiting for unauthenticated endpoints (/api/feedback,
--    /api/auth/google-token). rate_limit_counters can't be reused because its
--    user_id FK references auth.users.
-- 2. Date-only indexes for the daily due-notifications cron, which queries
--    expenses by date and reminders by due_date across all families — the
--    existing (family_id, date) composite indexes can't serve those scans.

CREATE TABLE IF NOT EXISTS public.ip_rate_limit_counters (
  key text NOT NULL,            -- sha256 hex of the client IP (no raw PII stored)
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, endpoint, window_start)
);

ALTER TABLE public.ip_rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ip_rate_limit_counters FROM anon;
REVOKE ALL ON public.ip_rate_limit_counters FROM authenticated;
GRANT ALL ON public.ip_rate_limit_counters TO service_role;

CREATE INDEX IF NOT EXISTS ip_rate_limit_counters_window_idx
  ON public.ip_rate_limit_counters(window_start);

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(
  p_key text,
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
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF p_key IS NULL OR p_endpoint IS NULL OR p_max_count < 1 THEN
    RAISE EXCEPTION 'invalid_ip_rate_limit_args';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.ip_rate_limit_counters AS c (key, endpoint, window_start, count)
  VALUES (p_key, p_endpoint, v_window_start, 1)
  ON CONFLICT (key, endpoint, window_start)
  DO UPDATE SET count = c.count + 1
  RETURNING c.count INTO v_count;

  -- Opportunistic cleanup of stale windows (cheap thanks to the window index)
  DELETE FROM public.ip_rate_limit_counters
  WHERE window_start < now() - interval '1 day';

  RETURN v_count <= p_max_count;
END;
$$;

REVOKE ALL ON FUNCTION public.check_ip_rate_limit(text, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text, text, integer, integer) TO service_role;

-- Perf: cross-family date scans in /api/cron/due-notifications
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
