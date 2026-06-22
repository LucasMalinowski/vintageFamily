export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const
export type AppLocale = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE: AppLocale = 'pt-BR'

export const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE'

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
