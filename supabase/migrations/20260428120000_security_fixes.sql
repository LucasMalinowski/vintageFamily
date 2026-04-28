-- OTP rate limiting columns on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verification_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_otp_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_otp_hour_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone_otp_hour_start timestamptz;

-- password_hash is unused (auth delegated to Supabase); allow null for new rows
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Families: enforce deleted_at on the select RLS policy
DROP POLICY IF EXISTS "families_select_own" ON public.families;
CREATE POLICY "families_select_own"
  ON public.families
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

-- whatsapp_context: no authenticated-role policy — service role only
-- (RLS already enabled in 20260426120000; this makes the deny explicit)
DROP POLICY IF EXISTS "whatsapp_context_deny_clients" ON public.whatsapp_context;
CREATE POLICY "whatsapp_context_deny_clients"
  ON public.whatsapp_context
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- feedback: no authenticated-role policy — inserts go through service role in API
DROP POLICY IF EXISTS "feedback_deny_clients" ON public.feedback;
CREATE POLICY "feedback_deny_clients"
  ON public.feedback
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- whatsapp_message_log: deny direct client access (service role only)
DROP POLICY IF EXISTS "whatsapp_message_log_deny_clients" ON public.whatsapp_message_log;
CREATE POLICY "whatsapp_message_log_deny_clients"
  ON public.whatsapp_message_log
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
