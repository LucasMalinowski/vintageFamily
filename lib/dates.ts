import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addMonths,
  addWeeks,
  isBefore,
  isAfter,
  isToday,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const ALL_MONTHS_VALUE = 0
export const ALL_YEARS_VALUE = 0

export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return format(parsedDate, pattern, { locale: ptBR })
}

export function formatMonth(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return format(date, 'MMMM', { locale: ptBR })
}

export function formatMonthYear(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  const formatted = format(parsedDate, "MMMM 'de' yyyy", { locale: ptBR })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function getMonthRange(month: number, year: number) {
  const date = new Date(year, month - 1, 1)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

export function getYearRange(year: number) {
  const date = new Date(year, 0, 1)
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  }
}

export function isDateWithinFilters(date: string, month: number, year: number): boolean {
  const parsedDate = parseISO(date)
  if (year !== ALL_YEARS_VALUE && parsedDate.getFullYear() !== year) {
    return false
  }
  if (month !== ALL_MONTHS_VALUE && parsedDate.getMonth() + 1 !== month) {
    return false
  }
  return true
}

export function getMonthLabel(month: number): string {
  if (month === ALL_MONTHS_VALUE) return 'Todos os meses'
  return MONTHS.find((item) => item.value === month)?.label ?? String(month)
}

export function getYearLabel(year: number): string {
  if (year === ALL_YEARS_VALUE) return 'Todos os anos'
  return String(year)
}

export function getPeriodLabel(month: number, year: number): string {
  if (month === ALL_MONTHS_VALUE && year === ALL_YEARS_VALUE) {
    return 'Todos os registros'
  }

  if (month === ALL_MONTHS_VALUE) {
    return `Todos os meses de ${getYearLabel(year)}`
  }

  if (year === ALL_YEARS_VALUE) {
    return `${getMonthLabel(month)} de todos os anos`
  }

  return `${getMonthLabel(month)} ${year}`
}

export function isDueDateToday(date: string | null): boolean {
  if (!date) return false
  return isToday(parseISO(date))
}

export function isDueDateOverdue(date: string | null, isDone: boolean): boolean {
  if (!date || isDone) return false
  return isBefore(parseISO(date), new Date()) && !isToday(parseISO(date))
}

export function getNextRecurrence(date: string, recurrence: 'weekly' | 'monthly'): string {
  const currentDate = parseISO(date)
  if (recurrence === 'weekly') {
    return format(addWeeks(currentDate, 1), 'yyyy-MM-dd')
  }
  return format(addMonths(currentDate, 1), 'yyyy-MM-dd')
}

export const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

export function getMonthOptions(includeAll: boolean = false): { value: string; label: string }[] {
  return [
    ...(includeAll ? [{ value: ALL_MONTHS_VALUE.toString(), label: 'Todos os meses' }] : []),
    ...MONTHS.map((month) => ({ value: month.value.toString(), label: month.label })),
  ]
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

export function getYearOptions(startYear: number = 2020, includeAll: boolean = false): { value: string; label: string }[] {
  const currentYear = getCurrentYear()
  const years: { value: string; label: string }[] = []

  if (includeAll) {
    years.push({ value: ALL_YEARS_VALUE.toString(), label: 'Todos os anos' })
  }

  for (let year = currentYear; year >= startYear; year--) {
    years.push({ value: year.toString(), label: year.toString() })
  }

  return years
}
