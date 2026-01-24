-- ================================================
-- POLÍTICAS RLS CORRIGIDAS PARA SIGNUP
-- Execute este arquivo APÓS o schema.sql
-- ================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their own family" ON families;
DROP POLICY IF EXISTS "Users can update their own family" ON families;
DROP POLICY IF EXISTS "Users can view family members" ON users;

-- FAMILIES: Permitir INSERT durante signup
CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own family"
  ON families FOR SELECT
  USING (id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own family"
  ON families FOR UPDATE
  USING (id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- USERS: Permitir INSERT durante signup
CREATE POLICY "Authenticated users can create their profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view family members"
  ON users FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- CATEGORIES: Permitir INSERT para novos usuários
DROP POLICY IF EXISTS "Users can insert family categories" ON categories;

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- EXPENSES: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete family expenses" ON expenses;

CREATE POLICY "Users can view family expenses"
  ON expenses FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family expenses"
  ON expenses FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update family expenses"
  ON expenses FOR UPDATE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete family expenses"
  ON expenses FOR DELETE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- INCOMES: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete family incomes" ON incomes;

CREATE POLICY "Users can view family incomes"
  ON incomes FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family incomes"
  ON incomes FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update family incomes"
  ON incomes FOR UPDATE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete family incomes"
  ON incomes FOR DELETE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- DREAMS: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can insert family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can update family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can delete family dreams" ON dreams;

CREATE POLICY "Users can view family dreams"
  ON dreams FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family dreams"
  ON dreams FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update family dreams"
  ON dreams FOR UPDATE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete family dreams"
  ON dreams FOR DELETE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- DREAM_CONTRIBUTIONS: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can insert family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can delete family dream contributions" ON dream_contributions;

CREATE POLICY "Users can view family dream contributions"
  ON dream_contributions FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family dream contributions"
  ON dream_contributions FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete family dream contributions"
  ON dream_contributions FOR DELETE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- REMINDERS: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete family reminders" ON reminders;

CREATE POLICY "Users can view family reminders"
  ON reminders FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert family reminders"
  ON reminders FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update family reminders"
  ON reminders FOR UPDATE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete family reminders"
  ON reminders FOR DELETE
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

-- INVITES: Atualizar para usar auth.uid()
DROP POLICY IF EXISTS "Users can view invites for their family" ON invites;
DROP POLICY IF EXISTS "Users can insert invites for their family" ON invites;

CREATE POLICY "Users can view invites for their family"
  ON invites FOR SELECT
  USING (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert invites for their family"
  ON invites FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM users WHERE id = auth.uid()));
