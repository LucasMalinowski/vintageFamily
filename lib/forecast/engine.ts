import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatBRL } from '@/lib/money'

export type ForecastResult = {
  targetMonth: string
  fixedTotal: number
  installmentsTotal: number
  variableEstimate: number
  annualEventsTotal: number
  grandTotal: number
  confidence: 'high' | 'medium' | 'low' | 'insufficient'
  monthlyHistory: { month: string; total: number; variable: number }[]
}

function holtsSmoothing(series: number[], alpha = 0.5, beta = 0.3): number {
  if (series.length === 0) return 0
  if (series.length === 1) return series[0]
  let level = series[0]
  let trend = series[1] - series[0]
  for (let i = 1; i < series.length; i++) {
    const prevLevel = level
    level = alpha * series[i] + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }
  return Math.max(0, Math.round(level + trend))
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

function nextMonthYYYYMM(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function computeNextMonthForecast(
  familyId: string,
  targetYearMonth?: string,
): Promise<ForecastResult> {
  const target = targetYearMonth ?? nextMonthYYYYMM()
  const targetMonthNum = parseInt(target.split('-')[1], 10)

  // ── 1. Fetch last 6 months of actual expense totals ──────────────────────
  const LOOKBACK = 6
  const months: string[] = []
  for (let i = LOOKBACK; i >= 1; i--) months.push(addMonths(target, -i))

  const monthlyTotals = new Map<string, number>()
  for (const m of months) {
    const { start, end } = monthRange(m)
    const { data } = await supabaseAdmin
      .from('expenses')
      .select('amount_cents')
      .eq('family_id', familyId)
      .neq('status', 'pending_confirmation')
      .gte('date', start)
      .lte('date', end)
    const total = (data ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
    monthlyTotals.set(m, total)
  }

  // ── 2. Active recurring patterns that fall in target month ───────────────
  const { start: targetStart, end: targetEnd } = monthRange(target)
  const { data: recurringRows } = await supabaseAdmin
    .from('recurring_patterns')
    .select('estimated_amount_cents, frequency, next_expected_date')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .eq('kind', 'expense')

  let fixedTotal = 0
  for (const row of recurringRows ?? []) {
    const nextDate = row.next_expected_date
    if (!nextDate) continue
    if (nextDate >= targetStart && nextDate <= targetEnd) {
      fixedTotal += row.estimated_amount_cents ?? 0
    }
  }

  // ── 3. Existing installment series with remaining payments in target month ─
  const { data: installmentExpenses } = await supabaseAdmin
    .from('expenses')
    .select('installment_group_id, installments, installment_index, amount_cents, date')
    .eq('family_id', familyId)
    .not('installment_group_id', 'is', null)

  const groupMap = new Map<string, { installments: number; perInstallment: number; dates: string[] }>()
  for (const row of installmentExpenses ?? []) {
    const gid = row.installment_group_id!
    if (!groupMap.has(gid)) {
      groupMap.set(gid, { installments: row.installments ?? 1, perInstallment: row.amount_cents ?? 0, dates: [] })
    }
    groupMap.get(gid)!.dates.push(row.date)
  }

  let installmentsTotal = 0
  for (const [, group] of groupMap) {
    const sortedDates = group.dates.sort()
    const firstDate = sortedDates[0]
    if (!firstDate) continue
    const [fy, fm] = firstDate.split('-').map(Number)
    const [ty, tm] = target.split('-').map(Number)
    const monthsElapsed = (ty - fy) * 12 + (tm - fm)
    if (monthsElapsed >= 0 && monthsElapsed < group.installments) {
      installmentsTotal += group.perInstallment
    }
  }

  // ── 4. Annual events for target month ────────────────────────────────────
  const { data: annualRows } = await supabaseAdmin
    .from('annual_events')
    .select('typical_amount_cents')
    .eq('family_id', familyId)
    .eq('typical_month', targetMonthNum)
    .eq('is_active', true)

  const annualEventsTotal = (annualRows ?? []).reduce(
    (s, r) => s + (r.typical_amount_cents ?? 0),
    0,
  )

  // ── 5. Variable estimate via Holt's (total minus fixed for each past month) ─
  // For historical months, estimate fixed cost by frequency rather than next_expected_date
  // (next_expected_date always points to future, so date-matching against history is always 0)
  const FREQ_MONTHS: Record<string, number> = {
    weekly: 4, biweekly: 2, monthly: 1, bimonthly: 0.5,
    quarterly: 0.33, semiannual: 0.17, annual: 0.08,
  }
  const historicalFixedPerOccurrence = (recurringRows ?? []).reduce((sum, row) => {
    const freq = row.frequency as string
    const occurrences = FREQ_MONTHS[freq] ?? 1
    return sum + Math.round((row.estimated_amount_cents ?? 0) * occurrences)
  }, 0)

  // Safety: if the fixed estimate exceeds the average monthly total, the recurring
  // costs are not in the expense history (user set them up as future patterns only).
  // In that case skip the subtraction — Holt's will project variable spending alone.
  const nonZeroTotals = months.map(m => monthlyTotals.get(m) ?? 0).filter(v => v > 0)
  const avgMonthlyTotal = nonZeroTotals.length > 0
    ? nonZeroTotals.reduce((a, b) => a + b, 0) / nonZeroTotals.length
    : 0
  const effectiveHistoricalFixed = historicalFixedPerOccurrence < avgMonthlyTotal * 0.8
    ? historicalFixedPerOccurrence
    : 0

  const variableSeries = months.map(m =>
    Math.max(0, (monthlyTotals.get(m) ?? 0) - effectiveHistoricalFixed),
  )

  const validMonths = months.filter(m => (monthlyTotals.get(m) ?? 0) > 0)
  const dataPoints = validMonths.length

  let variableEstimate = 0
  if (dataPoints >= 2) {
    const validVariable = variableSeries.slice(LOOKBACK - dataPoints)
    variableEstimate = holtsSmoothing(validVariable)
  } else if (dataPoints === 1) {
    variableEstimate = variableSeries[LOOKBACK - 1]
  }

  // ── 6. Confidence ────────────────────────────────────────────────────────
  let confidence: ForecastResult['confidence']
  if (dataPoints === 0) confidence = 'insufficient'
  else if (dataPoints === 1) confidence = 'low'
  else if (dataPoints <= 3) confidence = 'medium'
  else confidence = 'high'

  const grandTotal = fixedTotal + installmentsTotal + variableEstimate + annualEventsTotal

  const monthlyHistory = months.map(m => ({
    month: m,
    total: monthlyTotals.get(m) ?? 0,
    variable: Math.max(0, (monthlyTotals.get(m) ?? 0) - historicalFixedPerOccurrence),
  }))

  return {
    targetMonth: target,
    fixedTotal,
    installmentsTotal,
    variableEstimate,
    annualEventsTotal,
    grandTotal,
    confidence,
    monthlyHistory,
  }
}

export { formatBRL }
