-- Backfills name_en/name_es for existing system categories (is_system = true),
-- matching against the pt-BR names used by lib/families/categorySeeds.ts.
-- User-created categories are left untouched (name_en/name_es stay NULL and
-- fall back to `name` at display time).

WITH translations (name_pt, name_en, name_es) AS (
  VALUES
    -- Expense top-level categories
    ('Moradia', 'Housing', 'Vivienda'),
    ('Alimentação', 'Food', 'Alimentación'),
    ('Pets', 'Pets', 'Mascotas'),
    ('Lazer', 'Leisure', 'Ocio'),
    ('Investimentos para casa', 'Home Investments', 'Inversiones para el hogar'),
    ('Transporte', 'Transportation', 'Transporte'),
    ('Saúde', 'Health', 'Salud'),
    ('Roupas', 'Clothing', 'Ropa'),
    ('Assinaturas', 'Subscriptions', 'Suscripciones'),
    ('Educação', 'Education', 'Educación'),
    ('Hobbies', 'Hobbies', 'Pasatiempos'),
    ('Compras', 'Shopping', 'Compras'),
    ('Viagens', 'Travel', 'Viajes'),
    ('Impostos e taxas', 'Taxes and Fees', 'Impuestos y tasas'),
    ('Seguros', 'Insurance', 'Seguros'),
    ('Outros', 'Other', 'Otros'),
    ('outros', 'Other', 'Otros'),

    -- Income top-level categories
    ('Salário', 'Salary', 'Salario'),
    ('Vale Alimentação', 'Meal Allowance', 'Vale de comida'),
    ('Outras Receitas', 'Other Income', 'Otros ingresos'),
    ('outras receitas', 'Other Income', 'Otros ingresos'),

    -- Moradia subcategories
    ('Aluguel / Financiamento', 'Rent / Mortgage', 'Alquiler / Hipoteca'),
    ('Condomínio', 'HOA Fees', 'Cuota de condominio'),
    ('Energia', 'Electricity', 'Electricidad'),
    ('Água', 'Water', 'Agua'),
    ('Internet', 'Internet', 'Internet'),
    ('Gás', 'Gas', 'Gas'),
    ('Impostos sobre moradia', 'Property Taxes', 'Impuestos de vivienda'),
    ('Celular', 'Phone', 'Celular'),
    ('TV', 'TV', 'TV'),

    -- Alimentação subcategories
    ('Supermercado', 'Supermarket', 'Supermercado'),
    ('Restaurante', 'Restaurant', 'Restaurante'),
    ('Delivery', 'Delivery', 'Delivery'),

    -- Pets subcategories
    ('Ração', 'Pet Food', 'Comida para mascotas'),
    ('Veterinário', 'Veterinarian', 'Veterinario'),
    ('Itens diários', 'Daily Items', 'Artículos diarios'),

    -- Lazer subcategories
    ('Cinema', 'Movies', 'Cine'),
    ('Passeios', 'Outings', 'Salidas'),
    ('Eventos', 'Events', 'Eventos'),
    ('Presentes/Festas', 'Gifts/Parties', 'Regalos/Fiestas'),

    -- Investimentos para casa subcategories
    ('Móveis', 'Furniture', 'Muebles'),
    ('Eletrodomésticos', 'Appliances', 'Electrodomésticos'),
    ('Reformas', 'Renovations', 'Renovaciones'),

    -- Transporte subcategories
    ('Combustível', 'Fuel', 'Combustible'),
    ('Uber / Ônibus / Metrô', 'Uber / Bus / Subway', 'Uber / Autobús / Metro'),
    ('Manutenção', 'Maintenance', 'Mantenimiento'),
    ('Aluguel de veículos', 'Vehicle Rental', 'Alquiler de vehículos'),
    ('Aluguel de bicicletas', 'Bike Rental', 'Alquiler de bicicletas'),
    ('Estacionamentos', 'Parking', 'Estacionamientos'),
    ('Pedágios e pagamentos no veículo', 'Tolls and Vehicle Payments', 'Peajes y pagos del vehículo'),
    ('Taxas e impostos sobre veículos', 'Vehicle Taxes and Fees', 'Impuestos y tasas del vehículo'),
    ('Multas de trânsito', 'Traffic Fines', 'Multas de tránsito'),

    -- Saúde subcategories
    ('Farmácia', 'Pharmacy', 'Farmacia'),
    ('Consultas', 'Appointments', 'Consultas'),
    ('Exames', 'Tests', 'Exámenes'),
    ('Plano de Saúde', 'Health Insurance', 'Seguro médico'),
    ('Dentista', 'Dentist', 'Dentista'),
    ('Bem-estar', 'Wellness', 'Bienestar'),
    ('Academia e centros de lazer', 'Gym and Leisure Centers', 'Gimnasio y centros de ocio'),
    ('Prática de esportes', 'Sports Practice', 'Práctica de deportes'),
    ('Ótica', 'Optician', 'Óptica'),
    ('Hospitais, clínicas e laboratórios', 'Hospitals, Clinics and Labs', 'Hospitales, clínicas y laboratorios'),
    ('Salão de beleza e estética', 'Beauty Salon and Aesthetics', 'Salón de belleza y estética'),
    ('Cirurgias plásticas', 'Plastic Surgery', 'Cirugías plásticas'),

    -- Roupas subcategories
    ('Roupas do dia a dia', 'Everyday Clothing', 'Ropa del día a día'),
    ('Calçados', 'Shoes', 'Calzado'),
    ('Acessórios', 'Accessories', 'Accesorios'),

    -- Assinaturas subcategories
    ('Streaming', 'Streaming', 'Streaming'),
    ('Software', 'Software', 'Software'),
    ('Academia', 'Gym', 'Gimnasio'),

    -- Educação subcategories
    ('Cursos', 'Courses', 'Cursos'),
    ('Livros', 'Books', 'Libros'),
    ('Mensalidades', 'Tuition', 'Mensualidades'),
    ('Universidade', 'University', 'Universidad'),
    ('Escola', 'School', 'Escuela'),
    ('Creche', 'Daycare', 'Guardería'),

    -- Hobbies subcategories
    ('Esportes', 'Sports', 'Deportes'),
    ('Artesanato', 'Crafts', 'Artesanía'),
    ('Games', 'Games', 'Videojuegos'),

    -- Compras subcategories
    ('Compras online', 'Online Shopping', 'Compras en línea'),
    ('Eletrônicos', 'Electronics', 'Electrónica'),
    ('Artigos infantis', 'Kids'' Items', 'Artículos infantiles'),
    ('Artigos esportivos', 'Sporting Goods', 'Artículos deportivos'),
    ('Livraria', 'Bookstore', 'Librería'),
    ('Papelaria', 'Stationery', 'Papelería'),

    -- Viagens subcategories
    ('Aeroportos e cias. aéreas', 'Airports and Airlines', 'Aeropuertos y aerolíneas'),
    ('Hospedagem', 'Lodging', 'Alojamiento'),
    ('Programas de milhagem', 'Mileage Programs', 'Programas de millas'),
    ('Passagem de ônibus', 'Bus Tickets', 'Pasajes de autobús'),
    ('Bilhetes', 'Tickets', 'Boletos'),

    -- Impostos e taxas subcategories
    ('Impostos', 'Taxes', 'Impuestos'),

    -- Seguros subcategories
    ('Seguro de vida', 'Life Insurance', 'Seguro de vida'),
    ('Seguro residencial', 'Home Insurance', 'Seguro del hogar'),
    ('Seguro de veículos', 'Vehicle Insurance', 'Seguro de vehículos'),

    -- Salário subcategories
    ('Salário fixo', 'Fixed Salary', 'Salario fijo'),
    ('Bônus', 'Bonus', 'Bono'),

    -- Vale Alimentação (income) subcategories
    ('Benefício mensal', 'Monthly Benefit', 'Beneficio mensual'),

    -- Outras Receitas subcategories
    ('Cashback', 'Cashback', 'Cashback'),
    ('Renda não recorrente', 'Non-recurring Income', 'Ingreso no recurrente')
)
UPDATE public.categories c
SET name_en = t.name_en,
    name_es = t.name_es
FROM translations t
WHERE c.is_system = true
  AND c.name = t.name_pt;
