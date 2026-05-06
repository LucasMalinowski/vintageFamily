export type CategorySeed = {
  kind: 'income' | 'expense'
  name: string
  is_system: boolean
  icon?: string
  children?: Array<{
    name: string
  }>
}

export const FAMILY_CATEGORY_SEEDS: CategorySeed[] = [
  {
    kind: 'expense',
    name: 'Moradia',
    is_system: true,
    icon: 'House',
    children: [
      { name: 'Aluguel / Financiamento' },
      { name: 'Condomínio' },
      { name: 'Energia' },
      { name: 'Água' },
      { name: 'Internet' },
    ],
  },
  {
    kind: 'expense',
    name: 'Alimentação',
    is_system: true,
    icon: 'Utensils',
    children: [
      { name: 'Supermercado' },
      { name: 'Restaurante' },
      { name: 'Delivery' },
    ],
  },
  {
    kind: 'expense',
    name: 'Pets',
    is_system: true,
    icon: 'PawPrint',
    children: [
      { name: 'Ração' },
      { name: 'Veterinário' },
      { name: 'Itens diários' },
    ],
  },
  {
    kind: 'expense',
    name: 'Lazer',
    is_system: true,
    icon: 'Smile',
    children: [
      { name: 'Cinema' },
      { name: 'Passeios' },
      { name: 'Eventos' },
    ],
  },
  {
    kind: 'expense',
    name: 'Investimentos para casa',
    is_system: true,
    icon: 'HousePlus',
    children: [
      { name: 'Móveis' },
      { name: 'Eletrodomésticos' },
      { name: 'Reformas' },
    ],
  },
  {
    kind: 'expense',
    name: 'Transporte',
    is_system: true,
    icon: 'Car',
    children: [
      { name: 'Combustível' },
      { name: 'Uber / Ônibus / Metrô' },
      { name: 'Manutenção' },
    ],
  },
  {
    kind: 'expense',
    name: 'Saúde',
    is_system: true,
    icon: 'HeartPlus',
    children: [
      { name: 'Farmácia' },
      { name: 'Consultas' },
      { name: 'Exames' },
    ],
  },
  {
    kind: 'expense',
    name: 'Roupas',
    is_system: true,
    icon: 'Shirt',
    children: [
      { name: 'Roupas do dia a dia' },
      { name: 'Calçados' },
      { name: 'Acessórios' },
    ],
  },
  {
    kind: 'expense',
    name: 'Assinaturas',
    is_system: true,
    icon: 'MonitorPlay',
    children: [
      { name: 'Streaming' },
      { name: 'Software' },
      { name: 'Academia' },
    ],
  },
  {
    kind: 'expense',
    name: 'Educação',
    is_system: true,
    icon: 'Book',
    children: [
      { name: 'Cursos' },
      { name: 'Livros' },
      { name: 'Mensalidades' },
    ],
  },
  {
    kind: 'expense',
    name: 'Hobbies',
    is_system: true,
    icon: 'Guitar',
    children: [
      { name: 'Esportes' },
      { name: 'Artesanato' },
      { name: 'Games' },
    ],
  },
  { kind: 'expense', name: 'Outros', is_system: true, icon: 'Receipt' },
  {
    kind: 'income',
    name: 'Salário',
    is_system: true,
    icon: 'Banknote',
    children: [
      { name: 'Salário fixo' },
      { name: 'Bônus' },
    ],
  },
  {
    kind: 'income',
    name: 'Vale Alimentação',
    is_system: true,
    icon: 'WalletCards',
    children: [
      { name: 'Benefício mensal' },
    ],
  },
  { kind: 'income', name: 'Outras Receitas', is_system: true, icon: 'BadgeDollarSign' },
]
