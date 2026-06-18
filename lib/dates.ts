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
import type { AppLocale } from '@/lib/i18n/getLocale'

export const ALL_MONTHS_VALUE = 0
export const ALL_YEARS_VALUE = 0

const INTL_LOCALE: Record<AppLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const ALL_MONTHS_LABEL: Record<AppLocale, string> = {
  'pt-BR': 'Todos os meses',
  en: 'All months',
  es: 'Todos los meses',
}

const ALL_YEARS_LABEL: Record<AppLocale, string> = {
  'pt-BR': 'Todos os anos',
  en: 'All years',
  es: 'Todos los años',
}

const ALL_RECORDS_LABEL: Record<AppLocale, string> = {
  'pt-BR': 'Todos os registros',
  en: 'All records',
  es: 'Todos los registros',
}

export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return format(parsedDate, pattern, { locale: ptBR })
}

export function formatMonth(month: number, locale: AppLocale = 'pt-BR'): string {
  const date = new Date(2000, month - 1, 1)
  const name = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(date)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function formatMonthYear(date: string | Date, locale: AppLocale = 'pt-BR'): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  const monthName = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(parsedDate)
  const year = parsedDate.getFullYear()
  const formatted = locale === 'pt-BR' ? `${monthName} de ${year}` : `${monthName} ${year}`
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

export function getMonthLabel(month: number, locale: AppLocale = 'pt-BR'): string {
  if (month === ALL_MONTHS_VALUE) return ALL_MONTHS_LABEL[locale]
  return getMonths(locale).find((item) => item.value === month)?.label ?? String(month)
}

export function getYearLabel(year: number, locale: AppLocale = 'pt-BR'): string {
  if (year === ALL_YEARS_VALUE) return ALL_YEARS_LABEL[locale]
  return String(year)
}

export function getPeriodLabel(month: number, year: number, locale: AppLocale = 'pt-BR'): string {
  if (month === ALL_MONTHS_VALUE && year === ALL_YEARS_VALUE) {
    return ALL_RECORDS_LABEL[locale]
  }

  if (month === ALL_MONTHS_VALUE) {
    return `${ALL_MONTHS_LABEL[locale]} ${locale === 'pt-BR' ? 'de ' : ''}${getYearLabel(year, locale)}`
  }

  if (year === ALL_YEARS_VALUE) {
    const allYearsLower = ALL_YEARS_LABEL[locale].charAt(0).toLowerCase() + ALL_YEARS_LABEL[locale].slice(1)
    return locale === 'pt-BR'
      ? `${getMonthLabel(month, locale)} de ${allYearsLower}`
      : `${getMonthLabel(month, locale)} ${allYearsLower}`
  }

  return `${getMonthLabel(month, locale)} ${year}`
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

/**
 * @deprecated Hardcoded Portuguese month names. Use `getMonths(locale)` instead.
 * Kept only for backward compatibility with any stray imports.
 */
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

export function getMonths(locale: AppLocale = 'pt-BR'): { value: number; label: string }[] {
  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: formatMonth(index + 1, locale),
  }))
}

export function getMonthOptions(includeAll: boolean = false, locale: AppLocale = 'pt-BR'): { value: string; label: string }[] {
  return [
    ...(includeAll ? [{ value: ALL_MONTHS_VALUE.toString(), label: ALL_MONTHS_LABEL[locale] }] : []),
    ...getMonths(locale).map((month) => ({ value: month.value.toString(), label: month.label })),
  ]
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

export function getYearOptions(startYear: number = 2020, includeAll: boolean = false, locale: AppLocale = 'pt-BR'): { value: string; label: string }[] {
  const currentYear = getCurrentYear()
  const years: { value: string; label: string }[] = []

  if (includeAll) {
    years.push({ value: ALL_YEARS_VALUE.toString(), label: ALL_YEARS_LABEL[locale] })
  }

  for (let year = currentYear; year >= startYear; year--) {
    years.push({ value: year.toString(), label: year.toString() })
  }

  return years
}
