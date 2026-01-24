-- ================================================
-- DESABILITAR RLS PARA DESENVOLVIMENTO
-- Use isso temporariamente até o app estar funcionando
-- ================================================

-- Desabilitar RLS em todas as tabelas
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dreams DISABLE ROW LEVEL SECURITY;
ALTER TABLE dream_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DROP POLICY IF EXISTS "Anyone can insert families" ON families;
DROP POLICY IF EXISTS "Users can view own family" ON families;
DROP POLICY IF EXISTS "Users can update own family" ON families;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Anyone can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can view family categories" ON categories;
DROP POLICY IF EXISTS "Users can update family categories" ON categories;
DROP POLICY IF EXISTS "Users can delete family categories" ON categories;
DROP POLICY IF EXISTS "Users can view family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can insert family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can update family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can delete family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can view family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can insert family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can delete family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can view family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can view invites for their family" ON invites;
DROP POLICY IF EXISTS "Users can insert invites for their family" ON invites;

SELECT 'RLS desabilitado! Agora o signup vai funcionar.' as message;
SELECT 'ATENÇÃO: Habilite RLS novamente antes de deploy em produção!' as warning;
