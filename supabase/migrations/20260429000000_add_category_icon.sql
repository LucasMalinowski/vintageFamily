ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon text DEFAULT NULL;
ALTER TABLE savings    ADD COLUMN IF NOT EXISTS icon text DEFAULT NULL;

-- Backfill default icons for existing system categories by name
UPDATE categories SET icon = 'House'           WHERE is_system = true AND name = 'Moradia';
UPDATE categories SET icon = 'Utensils'        WHERE is_system = true AND name = 'Alimentação';
UPDATE categories SET icon = 'Smile'           WHERE is_system = true AND name = 'Lazer';
UPDATE categories SET icon = 'HousePlus'       WHERE is_system = true AND name = 'Investimentos para casa';
UPDATE categories SET icon = 'Car'             WHERE is_system = true AND name = 'Transporte';
UPDATE categories SET icon = 'HeartPlus'       WHERE is_system = true AND name = 'Saúde';
UPDATE categories SET icon = 'Shirt'           WHERE is_system = true AND name = 'Roupas';
UPDATE categories SET icon = 'MonitorPlay'     WHERE is_system = true AND name = 'Assinaturas';
UPDATE categories SET icon = 'Book'            WHERE is_system = true AND name = 'Educação';
UPDATE categories SET icon = 'Guitar'          WHERE is_system = true AND name = 'Hobbies';
UPDATE categories SET icon = 'Receipt'         WHERE is_system = true AND name = 'Outros' AND kind = 'expense';
UPDATE categories SET icon = 'Banknote'        WHERE is_system = true AND name = 'Salário';
UPDATE categories SET icon = 'WalletCards'     WHERE is_system = true AND name = 'Vale Alimentação';
UPDATE categories SET icon = 'BadgeDollarSign' WHERE is_system = true AND name = 'Outras Receitas';

-- Backfill default icons for existing system savings by name
UPDATE savings SET icon = 'House'    WHERE is_system = true AND name = 'Casa';
UPDATE savings SET icon = 'Car'      WHERE is_system = true AND name = 'Carro';
UPDATE savings SET icon = 'TreePalm' WHERE is_system = true AND name = 'Viagem';
