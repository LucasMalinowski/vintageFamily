import { supabaseAdmin } from '@/lib/supabaseAdmin'

type FrequencyCode = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual'

const FREQUENCY_DAYS: Record<FrequencyCode, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  bimonthly: 60,
  quarterly: 91,
  semiannual: 182,
  annual: 365,
}

function normalizeDescription(desc: string): string {
  return desc.toLowerCase().trim().replace(/\s+/g, ' ')
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function detectFrequency(intervals: number[]): FrequencyCode | null {
  if (intervals.length === 0) return null
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length

  for (const [freq, days] of Object.entries(FREQUENCY_DAYS) as [FrequencyCode, number][]) {
    if (Math.abs(avg - days) <= days * 0.25) return freq
  }
  return null
}

export async function detectAndUpsertRecurringPatterns(familyId: string): Promise<number> {
  const since = new Date()
  since.setMonth(since.getMonth() - 2)
  const sinceDate = toISO(since)

  // Fetch last 2 months of expenses
  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('description, category_id, amount_cents, date')
    .eq('family_id', familyId)
    .gte('date', sinceDate)
    .not('status', 'eq', 'pending_confirmation')
    .order('date', { ascending: true })

  // Fetch last 2 months of incomes
  const { data: incomes } = await supabaseAdmin
    .from('incomes')
    .select('description, category_id, amount_cents, date')
    .eq('family_id', familyId)
    .gte('date', sinceDate)
    .order('date', { ascending: true })

  type Row = { description: string; category_id: string | null; amount_cents: number; date: string }
  type GroupedEntry = { kind: 'expense' | 'income'; rows: Row[] }

  const groups = new Map<string, GroupedEntry>()

  for (const row of (expenses ?? []) as Row[]) {
    const key = `expense::${normalizeDescription(row.description)}`
    if (!groups.has(key)) groups.set(key, { kind: 'expense', rows: [] })
    groups.get(key)!.rows.push(row)
  }
  for (const row of (incomes ?? []) as Row[]) {
    const key = `income::${normalizeDescription(row.description)}`
    if (!groups.has(key)) groups.set(key, { kind: 'income', rows: [] })
    groups.get(key)!.rows.push(row)
  }

  let upserted = 0

  for (const [, { kind, rows }] of groups) {
    if (rows.length < 2) continue

    const dates = rows.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime())
    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push(Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000))
    }

    const frequency = detectFrequency(intervals)
    if (!frequency) continue

    const lastRow = rows[rows.length - 1]
    const lastDate = new Date(lastRow.date)
    const nextDate = addDays(lastDate, FREQUENCY_DAYS[frequency])
    const avgCents = Math.round(rows.reduce((s, r) => s + r.amount_cents, 0) / rows.length)
    const mostCommonCategoryId = lastRow.category_id

    await supabaseAdmin
      .from('recurring_patterns')
      .upsert(
        {
          family_id: familyId,
          description_pattern: normalizeDescription(lastRow.description),
          kind,
          category_id: mostCommonCategoryId,
          estimated_amount_cents: avgCents,
          frequency,
          source: 'auto',
          day_of_month: lastDate.getDate() <= 28 ? lastDate.getDate() : 28,
          last_occurrence_date: toISO(lastDate),
          next_expected_date: toISO(nextDate),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'family_id,description_pattern,kind',
          ignoreDuplicates: false,
        }
      )

    upserted++
  }

  return upserted
}
