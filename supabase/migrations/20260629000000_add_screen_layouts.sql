-- Add screen_layouts to users: stores per-screen widget order and visibility
-- as { screenId: { order: string[], hidden: string[] } }.
-- Follows the same pattern as analytics_consent / locale columns added post-hardening.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS screen_layouts jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT (screen_layouts) ON public.users TO authenticated;
GRANT UPDATE (screen_layouts) ON public.users TO authenticated;
