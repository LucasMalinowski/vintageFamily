import { addMonths, format, parseISO } from 'date-fns'

export function splitAmountCents(totalCents: number, installments: number): number[] {
  if (installments <= 1) return [totalCents]

  const base = Math.floor(totalCents / installments)
  const remainder = totalCents - base * installments

  return Array.from({ length: installments }, (_, index) => base + (index < remainder ? 1 : 0))
}

export function buildInstallmentDates(startDate: string, installments: number): string[] {
  const start = parseISO(startDate)

  return Array.from({ length: installments }, (_, index) =>
    format(addMonths(start, index), 'yyyy-MM-dd')
  )
}
