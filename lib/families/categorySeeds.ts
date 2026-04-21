export type CategorySeed = {
  kind: 'income' | 'expense'
  name: string
  is_system: boolean
  children?: Array<{
    name: string
  }>
}

export const FAMILY_CATEGORY_SEEDS: CategorySeed[] = [
  {
    kind: 'expense',
    name: 'Moradia',
    is_system: true,
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
    children: [
      { name: 'Supermercado' },
      { name: 'Restaurante' },
      { name: 'Delivery' },
    ],
  },
  {
    kind: 'expense',
    name: 'Lazer',
    is_system: true,
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
    children: [
      { name: 'Esportes' },
      { name: 'Artesanato' },
      { name: 'Games' },
    ],
  },
  { kind: 'expense', name: 'Outros', is_system: true },
  {
    kind: 'income',
    name: 'Salário',
    is_system: true,
    children: [
      { name: 'Salário fixo' },
      { name: 'Bônus' },
    ],
  },
  {
    kind: 'income',
    name: 'Vale Alimentação',
    is_system: true,
    children: [
      { name: 'Benefício mensal' },
    ],
  },
  { kind: 'income', name: 'Outras Receitas', is_system: true },
]
