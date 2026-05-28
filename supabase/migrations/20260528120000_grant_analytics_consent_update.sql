-- analytics_consent was added after the column-level GRANT was defined in
-- 20260513123000_security_rls_storage_restrictive.sql, so it was never included.
-- Authenticated users need UPDATE on this column so ConsentSyncer can write their preference.

GRANT UPDATE (analytics_consent) ON public.users TO authenticated;
