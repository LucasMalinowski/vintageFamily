export type DateRange = { start: string; end: string }

/**
 * Returns the billing cycle date range for a given reference month.
 * If cycleDay=21 and referenceMonth="2026-05", returns { start: "2026-04-21", end: "2026-05-20" }.
 * If cycleDay=1 (default), behaves like a standard calendar month.
 */
export function getBillingCycleRange(cycleDay: number, referenceMonth: string): DateRange {
  const day = Math.max(1, Math.min(28, cycleDay))

  const [year, month] = referenceMonth.split('-').map(Number)

  if (day === 1) {
    // Standard month: first to last day
    const start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end }
  }

  // Cycle: from (day) of previous month to (day-1) of current month
  const startDate = new Date(year, month - 2, day) // previous month
  const endDate = new Date(year, month - 1, day - 1) // current month, day before cycle day

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  return { start: fmt(startDate), end: fmt(endDate) }
}

/**
 * Given today's date and a cycle day, returns the "current period" reference month string (YYYY-MM).
 * If today >= cycleDay, the period is this month; otherwise it's last month.
 */
export function getCurrentBillingPeriod(cycleDay: number, today: Date = new Date()): string {
  const day = Math.max(1, Math.min(28, cycleDay))
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const todayDay = today.getDate()

  if (day === 1 || todayDay >= day) {
    return `${year}-${String(month).padStart(2, '0')}`
  }

  // Before cycle day: period is previous month
  const prevDate = new Date(year, month - 2, 1)
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
}
