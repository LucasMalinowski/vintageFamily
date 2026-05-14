CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS token_hash text;

UPDATE public.invites
SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_hash_unique_idx
  ON public.invites(token_hash)
  WHERE token_hash IS NOT NULL;

DELETE FROM public.invites
WHERE accepted = false
  AND expires_at <= now();

WITH ranked_pending_invites AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY family_id, lower(email)
      ORDER BY expires_at DESC, created_at DESC
    ) AS rn
  FROM public.invites
  WHERE accepted = false
)
DELETE FROM public.invites i
USING ranked_pending_invites r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS invites_pending_family_email_unique_idx
  ON public.invites(family_id, (lower(email)))
  WHERE accepted = false;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_attachment_path_safe,
  ADD CONSTRAINT expenses_attachment_path_safe
  CHECK (
    attachment_path IS NULL
    OR attachment_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$'
  );

ALTER TABLE public.incomes
  DROP CONSTRAINT IF EXISTS incomes_attachment_path_safe,
  ADD CONSTRAINT incomes_attachment_path_safe
  CHECK (
    attachment_path IS NULL
    OR attachment_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$'
  );

ALTER TABLE public.web_handoff_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

UPDATE public.web_handoff_tokens
SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS web_handoff_tokens_token_hash_unique_idx
  ON public.web_handoff_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bank_statement_import_batches_family_file_hash_unique_idx
  ON public.bank_statement_import_batches(family_id, file_hash);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_created timestamptz;

CREATE TABLE IF NOT EXISTS public.usage_counters (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  period text NOT NULL,
  whatsapp_recordings integer NOT NULL DEFAULT 0,
  ai_queries integer NOT NULL DEFAULT 0,
  export_import_count integer NOT NULL DEFAULT 0,
  on_demand_insights integer NOT NULL DEFAULT 0,
  audio_messages integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, period)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage_counters FROM anon;
REVOKE ALL ON public.usage_counters FROM authenticated;
GRANT ALL ON public.usage_counters TO service_role;

CREATE OR REPLACE FUNCTION public.update_family_member_role(
  p_member_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.users%ROWTYPE;
  v_target public.users%ROWTYPE;
  v_admin_count integer;
  v_lock_key bigint;
BEGIN
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  SELECT * INTO v_actor
  FROM public.users
  WHERE id = auth.uid();

  IF NOT FOUND OR v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_lock_key := ('x' || substr(md5(v_actor.family_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_target
  FROM public.users
  WHERE id = p_member_id
    AND family_id = v_actor.family_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  SELECT count(*) INTO v_admin_count
  FROM public.users
  WHERE family_id = v_actor.family_id
    AND role = 'admin';

  IF v_target.role = 'admin' AND p_role <> 'admin' AND v_admin_count <= 1 THEN
    RAISE EXCEPTION 'cannot_demote_last_admin';
  END IF;

  PERFORM set_config('app.allow_sensitive_user_update', 'on', true);

  UPDATE public.users
  SET role = p_role
  WHERE id = p_member_id
    AND family_id = v_actor.family_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_family_member_role(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_family_member_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_family_member_profile(
  p_actor_id uuid,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.users%ROWTYPE;
  v_target public.users%ROWTYPE;
  v_admin_count integer;
  v_lock_key bigint;
BEGIN
  IF p_actor_id IS NULL OR p_member_id IS NULL OR p_actor_id = p_member_id THEN
    RAISE EXCEPTION 'invalid_member_removal';
  END IF;

  SELECT * INTO v_actor
  FROM public.users
  WHERE id = p_actor_id;

  IF NOT FOUND OR v_actor.role <> 'admin' THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_lock_key := ('x' || substr(md5(v_actor.family_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_target
  FROM public.users
  WHERE id = p_member_id
    AND family_id = v_actor.family_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found';
  END IF;

  IF v_target.role = 'admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM public.users
    WHERE family_id = v_actor.family_id
      AND role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'cannot_remove_last_admin';
    END IF;
  END IF;

  DELETE FROM public.users
  WHERE id = p_member_id
    AND family_id = v_actor.family_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_family_member_profile(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_family_member_profile(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_user_profile_for_account_deletion(
  p_user_id uuid,
  p_new_admin_id uuid DEFAULT NULL
)
RETURNS TABLE(family_id uuid, deleted_family boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.users%ROWTYPE;
  v_other_count integer;
  v_new_admin public.users%ROWTYPE;
  v_deleted_family boolean := false;
  v_lock_key bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_user';
  END IF;

  SELECT * INTO v_profile
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  v_lock_key := ('x' || substr(md5(v_profile.family_id::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_profile
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_profile.role = 'admin' THEN
    SELECT count(*) INTO v_other_count
    FROM public.users
    WHERE family_id = v_profile.family_id
      AND id <> p_user_id;

    IF v_other_count > 0 THEN
      IF p_new_admin_id IS NULL OR p_new_admin_id = p_user_id THEN
        RAISE EXCEPTION 'new_admin_required';
      END IF;

      SELECT * INTO v_new_admin
      FROM public.users
      WHERE id = p_new_admin_id
        AND family_id = v_profile.family_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid_new_admin';
      END IF;

      PERFORM set_config('app.allow_sensitive_user_update', 'on', true);
      UPDATE public.users
      SET role = 'admin'
      WHERE id = p_new_admin_id
        AND family_id = v_profile.family_id;
    ELSE
      PERFORM set_config('app.allow_sensitive_family_update', 'on', true);
      UPDATE public.families
      SET deleted_at = now()
      WHERE id = v_profile.family_id;
      v_deleted_family := true;
    END IF;
  END IF;

  DELETE FROM public.users
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_profile.family_id, v_deleted_family;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_profile_for_account_deletion(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_profile_for_account_deletion(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.rename_my_family(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'invalid_family_name';
  END IF;

  SELECT family_id INTO v_family_id
  FROM public.users
  WHERE id = auth.uid()
    AND role = 'admin';

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  PERFORM set_config('app.allow_sensitive_family_update', 'on', true);

  UPDATE public.families
  SET name = left(regexp_replace(trim(p_name), '\s+', ' ', 'g'), 120)
  WHERE id = v_family_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_my_family(text) FROM public;
GRANT EXECUTE ON FUNCTION public.rename_my_family(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.consume_web_handoff_token(p_token_hash text)
RETURNS TABLE(id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.web_handoff_tokens w
  SET used = true
  WHERE w.token_hash = p_token_hash
    AND w.used = false
    AND w.expires_at > now()
  RETURNING w.id, w.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_web_handoff_token(text) FROM public;

CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_family_id uuid,
  p_period text,
  p_counter text,
  p_limit integer
)
RETURNS TABLE(allowed boolean, new_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value integer;
BEGIN
  IF p_family_id IS NULL OR p_period IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'invalid_usage_counter_args';
  END IF;

  INSERT INTO public.usage_counters (family_id, period)
  VALUES (p_family_id, p_period)
  ON CONFLICT (family_id, period) DO NOTHING;

  IF p_counter = 'whatsapp_recordings' THEN
    UPDATE public.usage_counters
    SET whatsapp_recordings = whatsapp_recordings + 1
    WHERE family_id = p_family_id AND period = p_period AND whatsapp_recordings < p_limit
    RETURNING whatsapp_recordings INTO v_value;
  ELSIF p_counter = 'ai_queries' THEN
    UPDATE public.usage_counters
    SET ai_queries = ai_queries + 1
    WHERE family_id = p_family_id AND period = p_period AND ai_queries < p_limit
    RETURNING ai_queries INTO v_value;
  ELSIF p_counter = 'export_import_count' THEN
    UPDATE public.usage_counters
    SET export_import_count = export_import_count + 1
    WHERE family_id = p_family_id AND period = p_period AND export_import_count < p_limit
    RETURNING export_import_count INTO v_value;
  ELSIF p_counter = 'on_demand_insights' THEN
    UPDATE public.usage_counters
    SET on_demand_insights = on_demand_insights + 1
    WHERE family_id = p_family_id AND period = p_period AND on_demand_insights < p_limit
    RETURNING on_demand_insights INTO v_value;
  ELSIF p_counter = 'audio_messages' THEN
    UPDATE public.usage_counters
    SET audio_messages = audio_messages + 1
    WHERE family_id = p_family_id AND period = p_period AND audio_messages < p_limit
    RETURNING audio_messages INTO v_value;
  ELSE
    RAISE EXCEPTION 'invalid_counter';
  END IF;

  IF v_value IS NULL THEN
    RETURN QUERY SELECT false, p_limit;
  ELSE
    RETURN QUERY SELECT true, v_value;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage_counter(uuid, text, text, integer) FROM public;

CREATE TABLE IF NOT EXISTS public.family_job_locks (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  period text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, job_type, period)
);

ALTER TABLE public.family_job_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_job_locks FROM anon;
REVOKE ALL ON public.family_job_locks FROM authenticated;
GRANT ALL ON public.family_job_locks TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_subscription_from_stripe(
  p_user_id uuid,
  p_family_id uuid,
  p_stripe_subscription_id text,
  p_plan_code text,
  p_price_id text,
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
    RAISE EXCEPTION 'invalid_subscription_event';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    family_id,
    stripe_subscription_id,
    plan_code,
    price_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    last_stripe_event_created
  )
  VALUES (
    p_user_id,
    p_family_id,
    p_stripe_subscription_id,
    p_plan_code,
    p_price_id,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_event_created
  )
  ON CONFLICT (family_id) DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    plan_code = EXCLUDED.plan_code,
    price_id = EXCLUDED.price_id,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    last_stripe_event_created = EXCLUDED.last_stripe_event_created,
    updated_at = now()
  WHERE public.subscriptions.last_stripe_event_created IS NULL
     OR public.subscriptions.last_stripe_event_created <= EXCLUDED.last_stripe_event_created;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_subscription_from_stripe(uuid, uuid, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_from_stripe(uuid, uuid, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz) TO service_role;
