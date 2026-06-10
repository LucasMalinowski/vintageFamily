import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AnomalyFlag = {
  category_name: string
  category_id: string | null
  month: string
  amount_cents: number
  zScore: number
  alreadyConfirmed: boolean
}

function addMonths(yyyyMM: string, n: number): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthRange(yyyyMM: string): { start: string; end: string } {
  const [y, m] = yyyyMM.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return {
    start: `${yyyyMM}-01`,
    end: `${yyyyMM}-${String(last).padStart(2, '0')}`,
  }
}

export async function detectSpendingAnomalies(
  familyId: string,
  lookbackMonths = 12,
): Promise<AnomalyFlag[]> {
  const now = new Date()
  const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const months: string[] = []
  for (let i = lookbackMonths; i >= 1; i--) months.push(addMonths(currentYYYYMM, -i))

  const { start: windowStart } = monthRange(months[0])
  const { end: windowEnd } = monthRange(months[months.length - 1])

  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('category_name, category_id, amount_cents, date')
    .eq('family_id', familyId)
    .neq('status', 'pending_confirmation')
    .gte('date', windowStart)
    .lte('date', windowEnd)

  // Group by category + month
  const map = new Map<string, { category_id: string | null; byMonth: Map<string, number> }>()
  for (const row of expenses ?? []) {
    const cat = row.category_name || 'Outros'
    const month = (row.date as string).slice(0, 7)
    if (!map.has(cat)) map.set(cat, { category_id: row.category_id ?? null, byMonth: new Map() })
    const entry = map.get(cat)!
    entry.byMonth.set(month, (entry.byMonth.get(month) ?? 0) + (row.amount_cents ?? 0))
  }

  // Fetch confirmed annual events to mark alreadyConfirmed
  const { data: confirmedEvents } = await supabaseAdmin
    .from('annual_events')
    .select('category_name, typical_month')
    .eq('family_id', familyId)
    .eq('is_active', true)

  const confirmedSet = new Set<string>(
    (confirmedEvents ?? []).map(e => `${e.category_name}:${e.typical_month}`),
  )

  const flags: AnomalyFlag[] = []

  for (const [catName, { category_id, byMonth }] of map) {
    const values = months.map(m => byMonth.get(m) ?? 0)
    const nonZero = values.filter(v => v > 0)
    if (nonZero.length < 2) continue

    const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length
    const variance = nonZero.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nonZero.length
    const sigma = Math.sqrt(variance)
    if (sigma === 0) continue

    for (const [month, amount] of byMonth) {
      const zScore = (amount - mean) / sigma
      if (zScore >= 1.5) {
        const monthNum = parseInt(month.split('-')[1], 10)
        const alreadyConfirmed = confirmedSet.has(`${catName}:${monthNum}`)
        flags.push({ category_name: catName, category_id, month, amount_cents: amount, zScore, alreadyConfirmed })
      }
    }
  }

  // Sort by z-score descending, dedupe to latest unconfirmed anomaly per category
  flags.sort((a, b) => b.zScore - a.zScore)

  const seen = new Set<string>()
  return flags.filter(f => {
    if (seen.has(f.category_name)) return false
    seen.add(f.category_name)
    return true
  })
}
