import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/lib/money'

export interface CategoryLimitRow {
  categoryId: string
  categoryName: string
  parentName: string | null
  icon: string | null
  limitCents: number
  spentCents: number
  pct: number
  excessCents: number
  status: 'ok' | 'warning' | 'over'
}

export function limitStatus(pct: number): 'ok' | 'warning' | 'over' {
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warning'
  return 'ok'
}

export function limitBarColor(status: 'ok' | 'warning' | 'over'): string {
  if (status === 'over') return '#B05C3A'
  if (status === 'warning') return '#C2A45D'
  return '#6FBF8A'
}

export function formatLimitBadge(row: CategoryLimitRow): string {
  if (row.status === 'over') {
    return `${formatBRL(row.excessCents)} acima`
  }
  return `${row.pct}%`
}

export async function loadCategoryLimitsForMonth(
  familyId: string,
  year: number,
  month: number
): Promise<CategoryLimitRow[]> {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)

  // Load ALL expense categories to build the full tree for aggregation
  const [{ data: allCatsData }, { data: expenses }] = await Promise.all([
    supabase
      .from('categories')
      .select('id,name,parent_id,icon,monthly_limit_cents')
      .eq('family_id', familyId)
      .eq('kind', 'expense'),
    supabase
      .from('expenses')
      .select('category_id,amount_cents')
      .eq('family_id', familyId)
      .gte('date', firstDay)
      .lte('date', lastDay),
  ])

  type Cat = { id: string; name: string; parent_id: string | null; icon: string | null; monthly_limit_cents: number | null }
  const allCats = (allCatsData ?? []) as Cat[]
  const catsWithLimit = allCats.filter(c => c.monthly_limit_cents != null && c.monthly_limit_cents > 0)

  if (!catsWithLimit.length) return []

  // Build parent name map
  const parentNameMap = new Map<string, string>(
    allCats.filter(c => !c.parent_id).map(c => [c.id, c.name])
  )

  // Build children map: parentId → childIds
  const childrenOf = new Map<string, string[]>()
  for (const cat of allCats) {
    if (!cat.parent_id) continue
    const children = childrenOf.get(cat.parent_id) ?? []
    children.push(cat.id)
    childrenOf.set(cat.parent_id, children)
  }

  // Direct spending per category
  const directSpent = new Map<string, number>()
  for (const e of expenses ?? []) {
    if (!e.category_id) continue
    directSpent.set(e.category_id, (directSpent.get(e.category_id) ?? 0) + (e.amount_cents ?? 0))
  }

  // Aggregated spending: for a parent category, include all children's spending
  const aggregatedSpent = (catId: string, isParent: boolean): number => {
    const direct = directSpent.get(catId) ?? 0
    if (!isParent) return direct
    const childIds = childrenOf.get(catId) ?? []
    return direct + childIds.reduce((s, cid) => s + (directSpent.get(cid) ?? 0), 0)
  }

  const rows: CategoryLimitRow[] = catsWithLimit.map((cat) => {
    const isParent = !cat.parent_id
    const spentCents = aggregatedSpent(cat.id, isParent)
    const limitCents = cat.monthly_limit_cents!
    const pct = limitCents > 0 ? Math.round((spentCents / limitCents) * 100) : 0
    const excessCents = Math.max(0, spentCents - limitCents)
    const parentName = cat.parent_id ? (parentNameMap.get(cat.parent_id) ?? null) : null
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      parentName,
      icon: cat.icon,
      limitCents,
      spentCents,
      pct,
      excessCents,
      status: limitStatus(pct),
    }
  })

  return rows.sort((a, b) => b.pct - a.pct)
}
