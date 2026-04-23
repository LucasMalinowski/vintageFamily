-- Rename dreams → savings, dream_contributions → savings_contributions
-- Add type column (deposit/withdrawal) to savings_contributions

-- 1. Rename tables
ALTER TABLE public.dreams RENAME TO savings;
ALTER TABLE public.dream_contributions RENAME TO savings_contributions;

-- 2. Rename foreign key column
ALTER TABLE public.savings_contributions RENAME COLUMN dream_id TO saving_id;

-- 3. Add type column
ALTER TABLE public.savings_contributions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'deposit'
  CONSTRAINT savings_contributions_type_check CHECK (type IN ('deposit', 'withdrawal'));

-- 4. Update the hierarchy validation trigger function to reference the renamed table
CREATE OR REPLACE FUNCTION public.validate_dream_hierarchy()
RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
DECLARE
  parent_saving public.savings;
BEGIN
  new.name = regexp_replace(trim(new.name), '\s+', ' ', 'g');

  IF coalesce(new.name, '') = '' THEN
    RAISE EXCEPTION 'Saving name is required.';
  END IF;

  IF new.parent_id IS NOT NULL THEN
    IF new.parent_id = new.id THEN
      RAISE EXCEPTION 'Saving cannot be parent of itself.';
    END IF;

    SELECT *
    INTO parent_saving
    FROM public.savings
    WHERE id = new.parent_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent saving not found.';
    END IF;

    IF parent_saving.family_id <> new.family_id THEN
      RAISE EXCEPTION 'Parent saving must belong to the same family.';
    END IF;

    IF parent_saving.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only one level of subcategory is allowed for savings.';
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 5. Move trigger to new table name
DROP TRIGGER IF EXISTS dreams_validate_hierarchy ON public.savings;
CREATE TRIGGER savings_validate_hierarchy
BEFORE INSERT OR UPDATE ON public.savings
FOR EACH ROW EXECUTE FUNCTION public.validate_dream_hierarchy();

-- 6. Rename RLS policies for clarity
ALTER POLICY "dreams_family" ON public.savings RENAME TO "savings_family";
ALTER POLICY "dream_contributions_family" ON public.savings_contributions RENAME TO "savings_contributions_family";
