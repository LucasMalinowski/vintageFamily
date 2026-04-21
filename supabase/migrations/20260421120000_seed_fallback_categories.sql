-- Seed "Outros" (expense) and "Outras Receitas" (income) for families that don't have them yet

INSERT INTO public.categories (family_id, name, kind, is_system, parent_id)
SELECT f.id, 'Outros', 'expense', true, null
FROM public.families f
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = f.id
    AND c.kind = 'expense'
    AND lower(c.name) = 'outros'
    AND c.parent_id IS NULL
);

INSERT INTO public.categories (family_id, name, kind, is_system, parent_id)
SELECT f.id, 'Outras Receitas', 'income', true, null
FROM public.families f
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = f.id
    AND c.kind = 'income'
    AND lower(c.name) = 'outras receitas'
    AND c.parent_id IS NULL
);
