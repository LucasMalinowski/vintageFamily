# Guia de Implementação - Páginas Restantes

Este arquivo contém as instruções para implementar as páginas restantes do sistema.

## Estrutura de Arquivos a Criar

```
app/
├── payables/
│   └── page.tsx
├── receivables/
│   └── page.tsx
├── dreams/
│   └── page.tsx
├── balance/
│   └── page.tsx
└── comparatives/
    └── page.tsx

components/
├── ui/
│   ├── Modal.tsx
│   ├── Select.tsx
│   ├── FabButton.tsx
│   ├── StatCard.tsx
│   ├── FilterBar.tsx
│   ├── Toast.tsx
│   └── EmptyState.tsx
└── pages/
    ├── Payables.tsx
    ├── Receivables.tsx
    ├── Dreams.tsx
    ├── Balance.tsx
    └── Comparatives.tsx
```

## Padrão de Implementação de Página

Todas as páginas seguem este padrão:

```typescript
// app/[pagename]/page.tsx
'use client'

import { AuthProvider } from '@/components/AuthProvider'
import AppLayout from '@/components/layout/AppLayout'
import [PageComponent] from '@/components/pages/[PageComponent]'

export default function [Page]() {
  return (
    <AuthProvider>
      <AppLayout>
        <[PageComponent] />
      </AppLayout>
    </AuthProvider>
  )
}
```

## 1. Contas a Pagar (Payables)

### Funcionalidades:
- Listar despesas com filtros (mês, ano, categoria, status)
- Cards de resumo (Total, Pago, Em aberto)
- Modal para adicionar/editar despesa
- Menu kebab (⋯) para editar/remover
- FAB (+) para nova despesa

### Campos do Modal:
- Descrição (text)
- Categoria (select) - usar categories do banco
- Valor (money input com formatação BRL)
- Data (date)
- Status (toggle: Pago/Em aberto)
- Observação (textarea opcional)

### Queries Supabase:
```typescript
// Listar
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('family_id', familyId)
  .gte('date', startDate)
  .lte('date', endDate)
  .eq('category_name', category) // se filtro aplicado
  .eq('status', status) // se filtro aplicado
  .order('date', { ascending: false })

// Calcular totais
const total = expenses.reduce((sum, exp) => sum + exp.amount_cents, 0)
const paid = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount_cents, 0)
const open = total - paid
```

## 2. Contas a Receber (Receivables)

Igual a Payables, mas:
- Sem campo "status" (receitas são sempre recebidas)
- Categorias fixas: "Renda Familiar", "Outras Receitas"
- Tabela: `incomes`

## 3. Poupança/Sonhos (Dreams)

### Funcionalidades:
- Grid de cards de sonhos
- Cada card mostra:
  - Nome do sonho
  - Total poupado no período (filtrado)
  - Total acumulado (geral)
  - Barra de progresso (se houver meta)
- 2 botões FAB:
  - + Novo Sonho
  - + Novo Aporte
- Menu (⋯) por sonho: Editar/Remover

### Modal Novo Sonho:
- Nome
- Meta (opcional, em reais)

### Modal Novo Aporte:
- Sonho (select)
- Valor
- Data
- Observação (opcional)

### Queries:
```typescript
// Listar sonhos com totais
const { data: dreams } = await supabase
  .from('dreams')
  .select(`
    *,
    dream_contributions (
      amount_cents,
      date
    )
  `)
  .eq('family_id', familyId)

// Para cada sonho, calcular:
const totalPeriod = contributions
  .filter(c => c.date >= startDate && c.date <= endDate)
  .reduce((sum, c) => sum + c.amount_cents, 0)

const totalAccumulated = contributions
  .reduce((sum, c) => sum + c.amount_cents, 0)

const progress = dream.target_cents 
  ? (totalAccumulated / dream.target_cents) * 100 
  : 0
```

## 4. Saldo (Balance)

### Funcionalidades:
- 4 cards principais:
  - Total Recebido
  - Total Pago
  - Total Poupado
  - Saldo do Período (destaque)
- Gráfico de linha: saldo últimos 12 meses
- Gráfico de barras: comparativo anual
- Filtro: mês/ano

### Fórmula:
```typescript
const received = sumIncomes(month, year)
const paid = sumExpenses(month, year, 'paid')
const saved = sumDreamContributions(month, year)
const balance = received - paid - saved
```

### Query Comparativo Mensal:
```typescript
const months = []
for (let i = 11; i >= 0; i--) {
  const date = subMonths(new Date(), i)
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  
  const received = await getMonthTotal('incomes', month, year)
  const paid = await getMonthTotal('expenses', month, year)
  const saved = await getMonthTotal('dream_contributions', month, year)
  
  months.push({
    month: format(date, 'MMM'),
    received,
    paid,
    saved,
    balance: received - paid - saved
  })
}
```

## 5. Comparativos (Comparatives)

### Funcionalidades:
- Toggle: Mensal / Anual
- Filtros: Ano, Mês (para mensal)
- 3 gráficos:
  1. Recebido vs Pago (barras agrupadas)
  2. Saldo mês a mês (linha)
  3. Despesas por categoria (pizza)
- Tabela: Top categorias do período

### Componente Recharts Exemplo:
```typescript
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#D9CFBF" />
    <XAxis dataKey="month" stroke="#5A4633" />
    <YAxis stroke="#5A4633" />
    <Tooltip />
    <Line type="monotone" dataKey="balance" stroke="#3A5A6A" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

## Componentes UI Reutilizáveis

### Modal
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}
```

### Select
```typescript
interface SelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}
```

### FabButton
```typescript
interface FabButtonProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  position?: 'bottom-right' | 'bottom-left'
}
```

### StatCard
```typescript
interface StatCardProps {
  label: string
  value: number // em centavos
  color?: 'olive' | 'terracotta' | 'petrol' | 'coffee'
}
```

### Toast
```typescript
// Usar react-hot-toast ou criar simples
toast.success('Registrado no livro do mês.')
toast.error('Erro ao salvar.')
```

### EmptyState
```typescript
interface EmptyStateProps {
  message: string
  submessage?: string
}
```

## Helpers Adicionais Necessários

### lib/queries.ts
```typescript
export async function getMonthlyExpenses(
  familyId: string, 
  month: number, 
  year: number
) {
  const { start, end } = getMonthRange(month, year)
  
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('family_id', familyId)
    .gte('date', format(start, 'yyyy-MM-dd'))
    .lte('date', format(end, 'yyyy-MM-dd'))
  
  return data || []
}

// Similar para incomes e dream_contributions
```

### lib/calculations.ts
```typescript
export function calculateBalance(
  incomes: number,
  expenses: number,
  savings: number
): number {
  return incomes - expenses - savings
}

export function groupByCategory(expenses: Expense[]) {
  return expenses.reduce((acc, exp) => {
    if (!acc[exp.category_name]) {
      acc[exp.category_name] = 0
    }
    acc[exp.category_name] += exp.amount_cents
    return acc
  }, {} as Record<string, number>)
}
```

## Ordem de Implementação Recomendada

1. ✅ Criar componentes UI base (Modal, Select, etc)
2. ✅ Implementar Contas a Pagar (mais complexa, serve de referência)
3. ✅ Implementar Contas a Receber (similar)
4. ✅ Implementar Poupança/Sonhos (lógica diferente)
5. ✅ Implementar Saldo (queries agregadas)
6. ✅ Implementar Comparativos (gráficos)
7. ✅ Polimento final e testes

## Testes Importantes

- [ ] Criar despesa/receita/sonho
- [ ] Editar item existente
- [ ] Remover item
- [ ] Filtrar por mês/ano/categoria
- [ ] Marcar despesa como paga
- [ ] Adicionar aporte em sonho
- [ ] Ver saldo correto
- [ ] Gráficos renderizando
- [ ] Responsive mobile
- [ ] PWA instalável
- [ ] Logout/login mantém sessão

## Próximos Passos após MVP

1. Sistema de convites (tabela `invites`)
2. Notificações de lembretes vencidos
3. Exportar relatórios (PDF)
4. Anexar comprovantes (Supabase Storage)
5. Modo escuro ("vintage night")
6. Internacionalização (i18n)

---

**Importante**: Cada página deve ter tratamento de erro, loading states, e estados vazios com mensagens poéticas!
