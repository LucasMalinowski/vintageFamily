-- Dreams categories hierarchy (main + subcategories)

alter table public.dreams
  add column if not exists parent_id uuid,
  add column if not exists is_system boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dreams_parent_id_fkey'
      and conrelid = 'public.dreams'::regclass
  ) then
    alter table public.dreams
      add constraint dreams_parent_id_fkey
      foreign key (parent_id)
      references public.dreams(id)
      on delete restrict;
  end if;
end $$;

create unique index if not exists dreams_unique_main_name_idx
  on public.dreams (family_id, lower(name))
  where parent_id is null;

create unique index if not exists dreams_unique_sub_name_idx
  on public.dreams (family_id, parent_id, lower(name))
  where parent_id is not null;

create index if not exists dreams_family_parent_idx
  on public.dreams (family_id, parent_id);

create or replace function public.validate_dream_hierarchy()
returns trigger
language plpgsql
as $$
declare
  parent_dream public.dreams;
begin
  new.name = regexp_replace(trim(new.name), '\\s+', ' ', 'g');

  if coalesce(new.name, '') = '' then
    raise exception 'Dream name is required.';
  end if;

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Dream cannot be parent of itself.';
    end if;

    select *
    into parent_dream
    from public.dreams
    where id = new.parent_id;

    if not found then
      raise exception 'Parent dream not found.';
    end if;

    if parent_dream.family_id <> new.family_id then
      raise exception 'Parent dream must belong to the same family.';
    end if;

    if parent_dream.parent_id is not null then
      raise exception 'Only one level of subcategory is allowed for dreams.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists dreams_validate_hierarchy on public.dreams;
create trigger dreams_validate_hierarchy
before insert or update on public.dreams
for each row
execute function public.validate_dream_hierarchy();

-- Keep old default dreams as system entries where possible.
update public.dreams
set is_system = true
where parent_id is null
  and is_system = false
  and name in ('Casa', 'Carro', 'Viagem');
