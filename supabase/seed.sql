-- Insert sample family
INSERT INTO families (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Família Oliveira');

-- Insert sample users (password: senha123 - hash bcrypt)
INSERT INTO users (id, family_id, name, email, password_hash, role) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'João Oliveira', 'joao@oliveira.com', '$2a$10$rJ8kqJvYqXqXqXqXqXqXqOqKqKqKqKqKqKqKqKqKqKqKqKqKqK', 'admin'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Maria Oliveira', 'maria@oliveira.com', '$2a$10$rJ8kqJvYqXqXqXqXqXqXqOqKqKqKqKqKqKqKqKqKqKqKqKqKqK', 'member');

-- Insert expense categories
INSERT INTO categories (family_id, kind, name, is_system) VALUES 
('11111111-1111-1111-1111-111111111111', 'expense', 'Aluguel', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Energia', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Água', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Mercado', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Lazer', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Investimentos para casa', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Saúde', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Educação', true),
('11111111-1111-1111-1111-111111111111', 'expense', 'Hobbie', true);

-- Insert income categories
INSERT INTO categories (family_id, kind, name, is_system) VALUES 
('11111111-1111-1111-1111-111111111111', 'income', 'Renda Familiar', true),
('11111111-1111-1111-1111-111111111111', 'income', 'Outras Receitas', true);

-- Insert dream categories
INSERT INTO categories (family_id, kind, name, is_system) VALUES 
('11111111-1111-1111-1111-111111111111', 'dream', 'Casa', true),
('11111111-1111-1111-1111-111111111111', 'dream', 'Carro', true),
('11111111-1111-1111-1111-111111111111', 'dream', 'Viagem', true);

-- Insert sample expenses (April 2026)
INSERT INTO expenses (family_id, category_name, description, amount_cents, date, status, paid_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'Aluguel', 'Aluguel Abril', 200000, '2026-04-05', 'paid', '2026-04-05T10:00:00Z'),
('11111111-1111-1111-1111-111111111111', 'Energia', 'Conta de luz', 18990, '2026-04-10', 'paid', '2026-04-10T14:30:00Z'),
('11111111-1111-1111-1111-111111111111', 'Água', 'Conta de água', 8500, '2026-04-12', 'paid', '2026-04-12T09:15:00Z'),
('11111111-1111-1111-1111-111111111111', 'Mercado', 'Supermercado Extra', 52340, '2026-04-08', 'paid', '2026-04-08T18:20:00Z'),
('11111111-1111-1111-1111-111111111111', 'Mercado', 'Feira livre', 12800, '2026-04-15', 'paid', '2026-04-15T11:00:00Z'),
('11111111-1111-1111-1111-111111111111', 'Lazer', 'Cinema', 9600, '2026-04-20', 'paid', '2026-04-20T20:00:00Z'),
('11111111-1111-1111-1111-111111111111', 'Saúde', 'Farmácia', 15430, '2026-04-18', 'paid', '2026-04-18T16:45:00Z'),
('11111111-1111-1111-1111-111111111111', 'Educação', 'Material escolar', 23500, '2026-04-22', 'open', null),
('11111111-1111-1111-1111-111111111111', 'Hobbie', 'Livros', 8900, '2026-04-25', 'open', null);

-- Insert sample incomes (April 2026)
INSERT INTO incomes (family_id, category_name, description, amount_cents, date) VALUES 
('11111111-1111-1111-1111-111111111111', 'Renda Familiar', 'Salário João', 102700000, '2026-04-05', null),
('11111111-1111-1111-1111-111111111111', 'Outras Receitas', 'Freela design', 5100000, '2026-04-15', 'Projeto website');

-- Insert sample dreams
INSERT INTO dreams (id, family_id, name, target_cents) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Casa', 50000000),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Carro', 8000000),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Viagem', 1500000);

-- Insert sample dream contributions (April 2026)
INSERT INTO dream_contributions (family_id, dream_id, amount_cents, date, notes) VALUES 
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 25600000, '2026-04-05', 'Aporte mensal casa'),
('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 55500000, '2026-04-15', 'Economia férias');

-- Insert previous months data for comparatives (March 2026)
INSERT INTO expenses (family_id, category_name, description, amount_cents, date, status, paid_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'Aluguel', 'Aluguel Março', 200000, '2026-03-05', 'paid', '2026-03-05T10:00:00Z'),
('11111111-1111-1111-1111-111111111111', 'Energia', 'Conta de luz', 16500, '2026-03-10', 'paid', '2026-03-10T14:30:00Z'),
('11111111-1111-1111-1111-111111111111', 'Mercado', 'Compras do mês', 48900, '2026-03-12', 'paid', '2026-03-12T18:00:00Z');

INSERT INTO incomes (family_id, category_name, description, amount_cents, date) VALUES 
('11111111-1111-1111-1111-111111111111', 'Renda Familiar', 'Salário João', 102700000, '2026-03-05', null);

INSERT INTO dream_contributions (family_id, dream_id, amount_cents, date) VALUES 
('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 20000000, '2026-03-05');

-- Insert sample reminders
INSERT INTO reminders (family_id, title, due_date, category, is_done) VALUES 
('11111111-1111-1111-1111-111111111111', 'Conferir conta de água', '2026-04-02', 'Contas', true),
('11111111-1111-1111-1111-111111111111', 'Revisar lista de mercado', '2026-04-04', 'Casa', true),
('11111111-1111-1111-1111-111111111111', 'Planejar viagem de julho', '2026-04-08', 'Sonhos', false),
('11111111-1111-1111-1111-111111111111', 'Pagamento do aluguel', '2026-04-10', 'Família', false),
('11111111-1111-1111-1111-111111111111', 'Separar roupas para doação', '2026-04-15', 'Casa', false);
