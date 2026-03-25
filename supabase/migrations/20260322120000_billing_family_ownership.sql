alter table public.stripe_customers
  add column if not exists family_id uuid references public.families(id);

update public.stripe_customers sc
set family_id = u.family_id
from public.users u
where sc.user_id = u.id
  and sc.family_id is null;

alter table public.stripe_customers
  alter column family_id set not null;

create unique index if not exists stripe_customers_family_id_uniq_idx
  on public.stripe_customers(family_id);

alter table public.subscriptions
  add column if not exists family_id uuid references public.families(id);

update public.subscriptions s
set family_id = u.family_id
from public.users u
where s.user_id = u.id
  and s.family_id is null;

alter table public.subscriptions
  alter column family_id set not null;

create unique index if not exists subscriptions_family_id_uniq_idx
  on public.subscriptions(family_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;

create policy "subscriptions_select_family"
on public.subscriptions
for select
to authenticated
using (family_id = public.current_family_id());
