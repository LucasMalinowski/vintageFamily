-- annual_events was created without RLS, so by default (ALTER DEFAULT PRIVILEGES
-- FOR ROLE postgres ... GRANT ALL ON TABLES) it is fully readable/writable by
-- anon and authenticated via PostgREST. Lock it down to read-only, own-family.
-- Writes go through /api/forecast/confirm-annual using the service role, which
-- bypasses RLS, so no insert/update/delete policy is needed for authenticated.

alter table public.annual_events enable row level security;

revoke all on public.annual_events from anon;
revoke all on public.annual_events from authenticated;

grant select on public.annual_events to authenticated;

create policy "annual_events_select_family"
on public.annual_events
for select
to authenticated
using (family_id = public.current_family_id());
