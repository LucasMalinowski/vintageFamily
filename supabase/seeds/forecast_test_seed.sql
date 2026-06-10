-- ══════════════════════════════════════════════════════════════════════════
-- Forecast Feature Test Seed
-- Usage: paste the whole block in the Supabase SQL editor.
--
-- What this creates:
--   • 1 fake family  (família "Florim Teste")
--   • 5 expense categories
--   • 6 months of realistic expense history  (Dec-25 → May-26)
--       · Alimentação: trending up  (~R$800 → R$1020)
--       · Transporte:  stable       (~R$300-380)
--       · Presentes:   ANOMALY in Dec-25 (R$1250) → should trigger confirmation prompt
--       · Saúde:       sparse (2 months only)
--   • 2 recurring patterns (Aluguel R$2500 + Internet R$120)
--       both with next_expected_date in 2026-07 → shows up in fixedTotal
--   • 1 installment series  (TV parcelada, 12×R$350, started Jan-26)
--       months 1–6 already in expenses; months 7–12 are future → shows in installmentsTotal
--   • 1 confirmed annual_event (Seguro do carro, July, R$180000 = R$1800)
--
-- Expected forecast for July 2026 (rough):
--   fixedTotal        ≈ R$2620  (aluguel + internet)
--   installmentsTotal ≈ R$350   (month 7 of TV)
--   variableEstimate  ≈ R$1500-1700  (Holt's on variable after subtracting fixed)
--   annualEventsTotal ≈ R$1800  (seguro do carro)
--   grandTotal        ≈ R$6300-6500
--   confidence        = 'high'  (6 months of data)
--
-- Anomaly detection should flag:
--   Presentes in Dec-25 with z-score ≈ 2.3
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_family_id   uuid := gen_random_uuid();
  v_cat_alim    uuid := gen_random_uuid();
  v_cat_transp  uuid := gen_random_uuid();
  v_cat_present uuid := gen_random_uuid();
  v_cat_saude   uuid := gen_random_uuid();
  v_cat_outros  uuid := gen_random_uuid();
  v_tv_group    uuid := gen_random_uuid();
BEGIN

  -- ── Family ──────────────────────────────────────────────────────────────
  INSERT INTO families (id, name, created_at)
  VALUES (v_family_id, 'Florim Teste', now());

  -- ── Categories ───────────────────────────────────────────────────────────
  INSERT INTO categories (id, family_id, kind, name, icon)
  VALUES
    (v_cat_alim,    v_family_id, 'expense', 'Alimentação',  '🛒'),
    (v_cat_transp,  v_family_id, 'expense', 'Transporte',   '🚗'),
    (v_cat_present, v_family_id, 'expense', 'Presentes',    '🎁'),
    (v_cat_saude,   v_family_id, 'expense', 'Saúde',        '💊'),
    (v_cat_outros,  v_family_id, 'expense', 'Outros',       '📦');

  -- ═══════════════════════════════════════════════════════════════════════
  -- EXPENSE HISTORY  (Dec-25 → May-26)
  -- ═══════════════════════════════════════════════════════════════════════

  -- ── December 2025 ───────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    -- Fixos (aluguel + internet entram como despesa todo mês)
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel dez/25',          250000, '2025-12-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet dez/25',          12000, '2025-12-10', 'paid'),
    -- Alimentação trending ~850
    (v_family_id, v_cat_alim, 'Alimentação', 'Supermercado dez/25',   85000, '2025-12-05', 'paid'),
    (v_family_id, v_cat_alim, 'Alimentação', 'Feira dez/25',          18000, '2025-12-13', 'paid'),
    (v_family_id, v_cat_alim, 'Alimentação', 'Restaurante dez/25',    22000, '2025-12-22', 'paid'),
    -- Transporte
    (v_family_id, v_cat_transp, 'Transporte', 'Combustível dez/25',   22000, '2025-12-08', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte', 'Uber dez/25',          16000, '2025-12-18', 'paid'),
    -- Presentes — ANOMALY (natal + aniversário)
    (v_family_id, v_cat_present, 'Presentes', 'Presentes Natal',      80000, '2025-12-20', 'paid'),
    (v_family_id, v_cat_present, 'Presentes', 'Aniversário esposa',   45000, '2025-12-28', 'paid'),
    -- Outros
    (v_family_id, v_cat_outros, 'Outros', 'Assinatura streaming',      4500, '2025-12-01', 'paid');

  -- ── January 2026 ────────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel jan/26',          250000, '2026-01-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet jan/26',          12000, '2026-01-10', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Supermercado jan/26',  78000, '2026-01-06', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Feira jan/26',         18000, '2026-01-11', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Combustível jan/26',   19000, '2026-01-09', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Uber jan/26',          13000, '2026-01-24', 'paid'),
    (v_family_id, v_cat_present,'Presentes',   'Presente amigo secreto', 5000,'2026-01-10', 'paid'),
    (v_family_id, v_cat_outros, 'Outros',      'Assinatura streaming',   4500,'2026-01-01', 'paid');

  -- TV parcelada — installment series starts Jan/26 (12×R$350)
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status,
                        installment_group_id, installments, installment_index)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-01-15', 'paid',  v_tv_group, 12, 1),
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-02-15', 'paid',  v_tv_group, 12, 2),
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-03-15', 'paid',  v_tv_group, 12, 3),
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-04-15', 'paid',  v_tv_group, 12, 4),
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-05-15', 'paid',  v_tv_group, 12, 5),
    (v_family_id, v_cat_outros, 'Outros', 'TV Samsung 12x', 35000, '2026-06-15', 'open',  v_tv_group, 12, 6);
    -- months 7-12 are future, the engine detects those from the group metadata

  -- ── February 2026 ───────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel fev/26',          250000, '2026-02-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet fev/26',          12000, '2026-02-10', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Supermercado fev/26',  82000, '2026-02-07', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Feira fev/26',         18000, '2026-02-15', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Combustível fev/26',   18000, '2026-02-10', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Metrô fev/26',          9000, '2026-02-20', 'paid'),
    (v_family_id, v_cat_saude,  'Saúde',       'Farmácia fev/26',       8500, '2026-02-14', 'paid'),
    (v_family_id, v_cat_present,'Presentes',   'Dia dos Namorados',     8000, '2026-02-14', 'paid'),
    (v_family_id, v_cat_outros, 'Outros',      'Assinatura streaming',   4500,'2026-02-01', 'paid');

  -- ── March 2026 ──────────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel mar/26',          250000, '2026-03-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet mar/26',          12000, '2026-03-10', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Supermercado mar/26',  91000, '2026-03-05', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Feira mar/26',         19000, '2026-03-14', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Restaurante mar/26',   24000, '2026-03-28', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Combustível mar/26',   22000, '2026-03-08', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Uber mar/26',          12000, '2026-03-19', 'paid'),
    (v_family_id, v_cat_present,'Presentes',   'Aniversário filho',     4500, '2026-03-22', 'paid'),
    (v_family_id, v_cat_saude,  'Saúde',       'Consulta médica',      18000, '2026-03-11', 'paid'),
    (v_family_id, v_cat_outros, 'Outros',      'Assinatura streaming',   4500,'2026-03-01', 'paid');

  -- ── April 2026 ──────────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel abr/26',          250000, '2026-04-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet abr/26',          12000, '2026-04-10', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Supermercado abr/26',  95000, '2026-04-04', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Feira abr/26',         20000, '2026-04-12', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Combustível abr/26',   21000, '2026-04-09', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Uber abr/26',          10000, '2026-04-21', 'paid'),
    (v_family_id, v_cat_present,'Presentes',   'Páscoa crianças',       6000, '2026-04-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros',      'Assinatura streaming',   4500,'2026-04-01', 'paid');

  -- ── May 2026 ────────────────────────────────────────────────────────────
  INSERT INTO expenses (family_id, category_id, category_name, description, amount_cents, date, status)
  VALUES
    (v_family_id, v_cat_outros, 'Outros', 'Aluguel mai/26',          250000, '2026-05-05', 'paid'),
    (v_family_id, v_cat_outros, 'Outros', 'Internet mai/26',          12000, '2026-05-10', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Supermercado mai/26', 102000, '2026-05-06', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Feira mai/26',         22000, '2026-05-17', 'paid'),
    (v_family_id, v_cat_alim,   'Alimentação', 'Restaurante mai/26',   28000, '2026-05-25', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Combustível mai/26',   23500, '2026-05-07', 'paid'),
    (v_family_id, v_cat_transp, 'Transporte',  'Uber mai/26',          12000, '2026-05-22', 'paid'),
    (v_family_id, v_cat_present,'Presentes',   'Dia das Mães',          4000, '2026-05-10', 'paid'),
    (v_family_id, v_cat_outros, 'Outros',      'Assinatura streaming',   4500,'2026-05-01', 'paid');

  -- ═══════════════════════════════════════════════════════════════════════
  -- RECURRING PATTERNS
  -- Both will show up in fixedTotal for July (next_expected_date in July)
  -- ═══════════════════════════════════════════════════════════════════════
  INSERT INTO recurring_patterns
    (family_id, description_pattern, kind, category_id, estimated_amount_cents,
     frequency, source, day_of_month, tolerance_days, last_occurrence_date,
     next_expected_date, is_active)
  VALUES
    (v_family_id, 'aluguel', 'expense', v_cat_outros, 250000,
     'monthly', 'user', 5, 3, '2026-06-05', '2026-07-05', true),
    (v_family_id, 'internet', 'expense', v_cat_outros, 12000,
     'monthly', 'user', 10, 3, '2026-06-10', '2026-07-10', true);

  -- ═══════════════════════════════════════════════════════════════════════
  -- ANNUAL EVENT (Seguro do carro — July every year)
  -- Shows up in annualEventsTotal for July forecast
  -- ═══════════════════════════════════════════════════════════════════════
  INSERT INTO annual_events
    (family_id, description, category_id, category_name, typical_month, typical_amount_cents, is_active)
  VALUES
    (v_family_id, 'Seguro do carro', v_cat_transp, 'Transporte', 7, 180000, true);

  -- Print IDs so you can test the API manually
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed complete!';
  RAISE NOTICE 'family_id  = %', v_family_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'To test via API call you need a user linked to this family.';
  RAISE NOTICE 'Quickest way: update your own user profile:';
  RAISE NOTICE '  UPDATE users SET family_id = ''%'' WHERE id = ''<your-user-id>'';', v_family_id;
  RAISE NOTICE 'Or just query the engine tables directly:';
  RAISE NOTICE '  SELECT * FROM expenses WHERE family_id = ''%'' ORDER BY date;', v_family_id;
  RAISE NOTICE '  SELECT * FROM annual_events WHERE family_id = ''%'';', v_family_id;
  RAISE NOTICE '  SELECT * FROM recurring_patterns WHERE family_id = ''%'';', v_family_id;

END $$;
