ALTER TABLE public.recurring_patterns
ADD COLUMN IF NOT EXISTS amount_is_fixed BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.recurring_patterns.amount_is_fixed IS
  'When false, each auto-generated occurrence is created with amount_cents = 0 and status = pending_confirmation, prompting the user to enter the actual value.';
