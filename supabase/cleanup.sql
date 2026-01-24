-- ================================================
-- LIMPAR TODOS OS DADOS
-- Execute este script para resetar o banco
-- ================================================

-- Desabilitar RLS temporariamente para permitir delete
ALTER TABLE dream_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dreams DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;

-- Deletar dados (ordem respeitando foreign keys)
DELETE FROM dream_contributions;
DELETE FROM reminders;
DELETE FROM expenses;
DELETE FROM incomes;
DELETE FROM dreams;
DELETE FROM categories;
DELETE FROM invites;
DELETE FROM users;
DELETE FROM families;

-- Reabilitar RLS
ALTER TABLE dream_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Limpar usuários do Auth (CUIDADO: isso remove TODOS os usuários!)
-- Se quiser manter algum usuário, comente a linha abaixo
-- DELETE FROM auth.users;

SELECT 'Banco limpo! Agora você pode criar um novo usuário via signup.' as message;
