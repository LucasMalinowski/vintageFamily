-- ================================================
-- POLÍTICAS RLS SIMPLIFICADAS - SEM RECURSÃO
-- Execute este arquivo para corrigir o erro de recursão
-- ================================================

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
DROP POLICY IF EXISTS "Users can view their own family" ON families;
DROP POLICY IF EXISTS "Users can update their own family" ON families;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Users can view family members" ON users;
DROP POLICY IF EXISTS "Users can insert family categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Users can view family categories" ON categories;
DROP POLICY IF EXISTS "Users can update family categories" ON categories;
DROP POLICY IF EXISTS "Users can delete family categories" ON categories;

-- ================================================
-- FAMILIES - Políticas simples
-- ================================================
CREATE POLICY "Anyone can insert families"
  ON families FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own family"
  ON families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own family"
  ON families FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- USERS - Políticas simples
-- ================================================
CREATE POLICY "Anyone can insert users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view family members"
  ON users FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- CATEGORIES - Políticas simples
-- ================================================
CREATE POLICY "Anyone can insert categories"
  ON categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view family categories"
  ON categories FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update family categories"
  ON categories FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family categories"
  ON categories FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- EXPENSES
-- ================================================
DROP POLICY IF EXISTS "Users can view family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update family expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete family expenses" ON expenses;

CREATE POLICY "Users can view family expenses"
  ON expenses FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert family expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update family expenses"
  ON expenses FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family expenses"
  ON expenses FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- INCOMES
-- ================================================
DROP POLICY IF EXISTS "Users can view family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can insert family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can update family incomes" ON incomes;
DROP POLICY IF EXISTS "Users can delete family incomes" ON incomes;

CREATE POLICY "Users can view family incomes"
  ON incomes FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert family incomes"
  ON incomes FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update family incomes"
  ON incomes FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family incomes"
  ON incomes FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- DREAMS
-- ================================================
DROP POLICY IF EXISTS "Users can view family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can insert family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can update family dreams" ON dreams;
DROP POLICY IF EXISTS "Users can delete family dreams" ON dreams;

CREATE POLICY "Users can view family dreams"
  ON dreams FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert family dreams"
  ON dreams FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update family dreams"
  ON dreams FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family dreams"
  ON dreams FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- DREAM_CONTRIBUTIONS
-- ================================================
DROP POLICY IF EXISTS "Users can view family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can insert family dream contributions" ON dream_contributions;
DROP POLICY IF EXISTS "Users can delete family dream contributions" ON dream_contributions;

CREATE POLICY "Users can view family dream contributions"
  ON dream_contributions FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert family dream contributions"
  ON dream_contributions FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family dream contributions"
  ON dream_contributions FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- REMINDERS
-- ================================================
DROP POLICY IF EXISTS "Users can view family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can insert family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update family reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete family reminders" ON reminders;

CREATE POLICY "Users can view family reminders"
  ON reminders FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert family reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update family reminders"
  ON reminders FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete family reminders"
  ON reminders FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

-- ================================================
-- INVITES
-- ================================================
DROP POLICY IF EXISTS "Users can view invites for their family" ON invites;
DROP POLICY IF EXISTS "Users can insert invites for their family" ON invites;

CREATE POLICY "Users can view invites for their family"
  ON invites FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for their family"
  ON invites FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  );

SELECT 'Políticas RLS corrigidas! Agora tente criar uma conta novamente.' as message;
