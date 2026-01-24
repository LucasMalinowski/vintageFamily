import { format, parse, startOfMonth, endOfMonth, addMonths, addWeeks, isBefore, isAfter, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return format(parsedDate, pattern, { locale: ptBR })
}

export function formatMonth(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return format(date, 'MMMM', { locale: ptBR })
}

export function getMonthRange(month: number, year: number) {
  const date = new Date(year, month - 1, 1)
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
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

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

export function getYearOptions(startYear: number = 2020): { value: number; label: string }[] {
  const currentYear = getCurrentYear()
  const years: { value: number; label: string }[] = []
  
  for (let year = currentYear; year >= startYear; year--) {
    years.push({ value: year, label: year.toString() })
  }
  
  return years
}
