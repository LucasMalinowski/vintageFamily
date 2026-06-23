import { supabase } from '@/lib/supabase'
import { formatMoney } from '@/lib/money'
import { getCurrentBillingPeriod } from '@/lib/billing-cycle'
import type { useTranslations } from 'next-intl'

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
  silenced: boolean
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

export function formatLimitBadge(
  row: CategoryLimitRow,
  t: ReturnType<typeof useTranslations>,
  currency = 'BRL',
  locale = 'pt-BR'
): string {
  if (row.status === 'over') {
    return t('categoryModal.overAmount', { amount: formatMoney(row.excessCents, currency, locale) })
  }
  return `${row.pct}%`
}

export async function getUserBillingPeriodKey(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return getCurrentBillingPeriod(1)
  const { data } = await supabase.from('users').select('billing_cycle_day').eq('id', user.id).maybeSingle()
  return getCurrentBillingPeriod(data?.billing_cycle_day ?? 1)
}

export async function loadSilencedCategoryIds(familyId: string, billingPeriodKey: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('category_limit_silences')
    .select('category_id')
    .eq('family_id', familyId)
    .eq('billing_period_key', billingPeriodKey)
  return new Set((data ?? []).map((r) => r.category_id))
}

export async function toggleCategoryLimitSilence(
  familyId: string,
  categoryId: string,
  billingPeriodKey: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('category_limit_silences')
    .select('category_id')
    .eq('family_id', familyId)
    .eq('category_id', categoryId)
    .eq('billing_period_key', billingPeriodKey)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('category_limit_silences')
      .delete()
      .eq('family_id', familyId)
      .eq('category_id', categoryId)
      .eq('billing_period_key', billingPeriodKey)
    return false
  }

  // Delete any stale rows from previous periods before inserting the new one
  await supabase
    .from('category_limit_silences')
    .delete()
    .eq('family_id', familyId)
    .eq('category_id', categoryId)
    .neq('billing_period_key', billingPeriodKey)

  await supabase
    .from('category_limit_silences')
    .insert({ family_id: familyId, category_id: categoryId, billing_period_key: billingPeriodKey })
  return true
}

export async function loadCategoryLimitsForMonth(
  familyId: string,
  year: number,
  month: number,
  billingPeriodKey?: string
): Promise<CategoryLimitRow[]> {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)

  // Load ALL expense categories to build the full tree for aggregation
  const [{ data: allCatsData }, { data: expenses }, silencedIds] = await Promise.all([
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
    billingPeriodKey ? loadSilencedCategoryIds(familyId, billingPeriodKey) : Promise.resolve(new Set<string>()),
  ])

  type Cat = { id: string; name: string; parent_id: string | null; icon: string | null; monthly_limit_cents: number | null }
  const allCats = (allCatsData ?? []) as Cat[]
  const catsWithLimit = allCats.filter(c => c.monthly_limit_cents != null && c.monthly_limit_cents > 0)

  if (!catsWithLimit.length) return []

	  // Build parent name map
	  const parentNameMap = new Map<string, string>()
	  for (const cat of allCats) {
	    if (!cat.parent_id) {
	      parentNameMap.set(cat.id, cat.name)
	    }
	  }

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
      silenced: silencedIds.has(cat.id),
    }
  })

  return rows.sort((a, b) => b.pct - a.pct)
}
