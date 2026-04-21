-- WhatsApp integration: phone number + OTP verification
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number text UNIQUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number_pending text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verification_code text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verification_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_number
  ON public.users (phone_number)
  WHERE phone_number IS NOT NULL;

-- Allow null payment_method for WhatsApp-created expenses
ALTER TABLE public.expenses
  ALTER COLUMN payment_method DROP NOT NULL,
  ALTER COLUMN payment_method SET DEFAULT NULL;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_payment_method_check
  CHECK (payment_method IS NULL OR payment_method = ANY (ARRAY['PIX'::text, 'Credito'::text, 'Debito'::text]));
