-- The 20260513123000 security-hardening migration switched `families` from a
-- blanket GRANT to an explicit per-column allowlist, predating the `currency`
-- column added in 20260615010000. As a result `currency` was never readable
-- or writable by the `authenticated` role (PostgREST returns 42501
-- permission-denied for any select/update touching it), even though the
-- application code reads/writes it directly via the client.
--
-- Fix: grant SELECT on the column (read path, e.g. AuthProvider / profile
-- settings), and add a SECURITY DEFINER RPC for the write path, mirroring the
-- existing rename_my_family() pattern rather than opening direct UPDATE
-- access on the table.

GRANT SELECT (currency) ON public.families TO authenticated;

CREATE OR REPLACE FUNCTION public.update_family_currency(p_currency text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id uuid;
BEGIN
  SELECT family_id INTO v_family_id
  FROM public.users
  WHERE id = auth.uid()
    AND role = 'admin';

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.families
  SET currency = p_currency
  WHERE id = v_family_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.update_family_currency(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_family_currency(text) TO authenticated;
