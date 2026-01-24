-- ================================================
-- SEED PARA USUÁRIO EXISTENTE NO AUTH
-- ================================================
-- INSTRUÇÕES:
-- 1. Crie um usuário via SIGNUP primeiro (http://localhost:3000/signup)
-- 2. Pegue o UUID do usuário no Supabase: Authentication → Users → copie o ID
-- 3. Pegue o family_id na tabela: Table Editor → families → copie o ID da sua família
-- 4. Substitua os valores abaixo pelos seus IDs
-- 5. Execute este script
-- ================================================

-- ⚠️ SUBSTITUA ESTES VALORES:
DO $$
DECLARE
  v_user_id UUID := 'SEU_USER_ID_AQUI'; -- Pegue em Authentication → Users
  v_family_id UUID := 'SEU_FAMILY_ID_AQUI'; -- Pegue em Table Editor → families
BEGIN

-- Verificar se usuário existe
IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
  RAISE EXCEPTION 'Usuário não encontrado! Certifique-se de criar a conta via signup primeiro.';
END IF;

-- Verificar se família existe
IF NOT EXISTS (SELECT 1 FROM families WHERE id = v_family_id) THEN
  RAISE EXCEPTION 'Família não encontrada! Certifique-se de que o family_id está correto.';
END IF;

-- ================================================
-- DADOS DE TESTE - ABRIL 2026
-- ================================================

-- Despesas de Abril
INSERT INTO expenses (family_id, category_name, description, amount_cents, date, status, paid_at) VALUES 
(v_family_id, 'Aluguel', 'Aluguel Abril 2026', 200000, '2026-04-05', 'paid', '2026-04-05T10:00:00Z'),
(v_family_id, 'Energia', 'Conta de luz', 18990, '2026-04-10', 'paid', '2026-04-10T14:30:00Z'),
(v_family_id, 'Água', 'Conta de água', 8500, '2026-04-12', 'paid', '2026-04-12T09:15:00Z'),
(v_family_id, 'Mercado', 'Supermercado Extra', 52340, '2026-04-08', 'paid', '2026-04-08T18:20:00Z'),
(v_family_id, 'Mercado', 'Feira livre', 12800, '2026-04-15', 'paid', '2026-04-15T11:00:00Z'),
(v_family_id, 'Lazer', 'Cinema', 9600, '2026-04-20', 'paid', '2026-04-20T20:00:00Z'),
(v_family_id, 'Saúde', 'Farmácia', 15430, '2026-04-18', 'paid', '2026-04-18T16:45:00Z'),
(v_family_id, 'Educação', 'Material escolar', 23500, '2026-04-22', 'open', null),
(v_family_id, 'Hobbie', 'Livros', 8900, '2026-04-25', 'open', null);

-- Receitas de Abril
INSERT INTO incomes (family_id, category_name, description, amount_cents, date, notes) VALUES 
(v_family_id, 'Renda Familiar', 'Salário', 850000, '2026-04-05', null),
(v_family_id, 'Outras Receitas', 'Freela design', 120000, '2026-04-15', 'Projeto website');

-- Aportes nos Sonhos (Abril)
INSERT INTO dream_contributions (family_id, dream_id, amount_cents, date, notes) 
SELECT 
  v_family_id,
  d.id,
  25000,
  '2026-04-05',
  'Aporte mensal'
FROM dreams d 
WHERE d.family_id = v_family_id AND d.name = 'Casa';

INSERT INTO dream_contributions (family_id, dream_id, amount_cents, date, notes) 
SELECT 
  v_family_id,
  d.id,
  55000,
  '2026-04-15',
  'Economia para férias'
FROM dreams d 
WHERE d.family_id = v_family_id AND d.name = 'Viagem';

-- ================================================
-- DADOS DE TESTE - MARÇO 2026 (para comparativos)
-- ================================================

-- Despesas de Março
INSERT INTO expenses (family_id, category_name, description, amount_cents, date, status, paid_at) VALUES 
(v_family_id, 'Aluguel', 'Aluguel Março 2026', 200000, '2026-03-05', 'paid', '2026-03-05T10:00:00Z'),
(v_family_id, 'Energia', 'Conta de luz', 16500, '2026-03-10', 'paid', '2026-03-10T14:30:00Z'),
(v_family_id, 'Mercado', 'Compras do mês', 48900, '2026-03-12', 'paid', '2026-03-12T18:00:00Z'),
(v_family_id, 'Água', 'Conta de água', 7200, '2026-03-08', 'paid', '2026-03-08T09:00:00Z'),
(v_family_id, 'Lazer', 'Restaurante', 12500, '2026-03-22', 'paid', '2026-03-22T20:00:00Z');

-- Receitas de Março
INSERT INTO incomes (family_id, category_name, description, amount_cents, date) VALUES 
(v_family_id, 'Renda Familiar', 'Salário', 850000, '2026-03-05', null);

-- Aportes de Março
INSERT INTO dream_contributions (family_id, dream_id, amount_cents, date, notes) 
SELECT 
  v_family_id,
  d.id,
  20000,
  '2026-03-05',
  'Aporte mensal'
FROM dreams d 
WHERE d.family_id = v_family_id AND d.name = 'Casa';

-- ================================================
-- LEMBRETES
-- ================================================

INSERT INTO reminders (family_id, title, due_date, category, is_done, done_at) VALUES 
(v_family_id, 'Conferir conta de água', '2026-04-02', 'Contas', true, '2026-04-02T10:00:00Z'),
(v_family_id, 'Revisar lista de mercado', '2026-04-04', 'Casa', true, '2026-04-04T15:00:00Z'),
(v_family_id, 'Planejar viagem de julho', '2026-04-08', 'Sonhos', false, null),
(v_family_id, 'Pagamento do aluguel', CURRENT_DATE + INTERVAL '5 days', 'Contas', false, null),
(v_family_id, 'Separar roupas para doação', CURRENT_DATE + INTERVAL '10 days', 'Casa', false, null);

RAISE NOTICE 'Dados de teste inseridos com sucesso para família %!', v_family_id;

END $$;
