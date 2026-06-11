-- Retroactively add new default categories for existing families.
-- Mirrors the additions made to lib/families/categorySeeds.ts.

-- Block A: new top-level expense categories
INSERT INTO public.categories (family_id, name, kind, is_system, parent_id, icon)
SELECT f.id, v.name, 'expense', true, null, v.icon
FROM public.families f
CROSS JOIN (VALUES
  ('Compras', 'ShoppingBag'),
  ('Viagens', 'Plane'),
  ('Impostos e taxas', 'Landmark'),
  ('Seguros', 'Shield')
) AS v(name, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = f.id AND c.kind = 'expense' AND c.parent_id IS NULL AND lower(c.name) = lower(v.name)
);

-- Block B: subcategories for the new parents above
INSERT INTO public.categories (family_id, name, kind, is_system, parent_id)
SELECT p.family_id, v.child_name, 'expense', true, p.id
FROM public.categories p
CROSS JOIN (VALUES
  ('Compras', 'Compras online'),
  ('Compras', 'Eletrônicos'),
  ('Compras', 'Artigos infantis'),
  ('Compras', 'Artigos esportivos'),
  ('Compras', 'Livraria'),
  ('Compras', 'Papelaria'),
  ('Viagens', 'Aeroportos e cias. aéreas'),
  ('Viagens', 'Hospedagem'),
  ('Viagens', 'Programas de milhagem'),
  ('Viagens', 'Passagem de ônibus'),
  ('Viagens', 'Bilhetes'),
  ('Impostos e taxas', 'Impostos'),
  ('Seguros', 'Seguro de vida'),
  ('Seguros', 'Seguro residencial'),
  ('Seguros', 'Seguro de veículos')
) AS v(parent_name, child_name)
WHERE p.kind = 'expense' AND p.parent_id IS NULL AND lower(p.name) = lower(v.parent_name)
AND NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = p.family_id AND c.parent_id = p.id AND lower(c.name) = lower(v.child_name)
);

-- Block C: new subcategories on existing expense parents
INSERT INTO public.categories (family_id, name, kind, is_system, parent_id)
SELECT p.family_id, v.child_name, 'expense', true, p.id
FROM public.categories p
CROSS JOIN (VALUES
  ('Saúde', 'Bem-estar'),
  ('Saúde', 'Academia e centros de lazer'),
  ('Saúde', 'Prática de esportes'),
  ('Saúde', 'Ótica'),
  ('Saúde', 'Hospitais, clínicas e laboratórios'),
  ('Saúde', 'Salão de beleza e estética'),
  ('Saúde', 'Cirurgias plásticas'),
  ('Transporte', 'Aluguel de veículos'),
  ('Transporte', 'Aluguel de bicicletas'),
  ('Transporte', 'Estacionamentos'),
  ('Transporte', 'Pedágios e pagamentos no veículo'),
  ('Transporte', 'Taxas e impostos sobre veículos'),
  ('Transporte', 'Multas de trânsito'),
  ('Moradia', 'Gás'),
  ('Moradia', 'Impostos sobre moradia'),
  ('Moradia', 'Celular'),
  ('Moradia', 'TV'),
  ('Educação', 'Universidade'),
  ('Educação', 'Escola'),
  ('Educação', 'Creche')
) AS v(parent_name, child_name)
WHERE p.kind = 'expense' AND p.parent_id IS NULL AND lower(p.name) = lower(v.parent_name)
AND NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = p.family_id AND c.parent_id = p.id AND lower(c.name) = lower(v.child_name)
);

-- Block D: new income subcategories under "Outras Receitas"
INSERT INTO public.categories (family_id, name, kind, is_system, parent_id)
SELECT p.family_id, v.child_name, 'income', true, p.id
FROM public.categories p
CROSS JOIN (VALUES
  ('Cashback'),
  ('Renda não recorrente')
) AS v(child_name)
WHERE p.kind = 'income' AND p.parent_id IS NULL AND lower(p.name) = lower('Outras Receitas')
AND NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.family_id = p.family_id AND c.parent_id = p.id AND lower(c.name) = lower(v.child_name)
);
