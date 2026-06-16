import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es'] as const
export type AppLocale = typeof SUPPORTED_LOCALES[number]
export const DEFAULT_LOCALE: AppLocale = 'pt-BR'

export const NEXT_LOCALE_COOKIE = 'NEXT_LOCALE'

function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export async function getUserLocale(): Promise<AppLocale> {
  const cookieStore = cookies()
  const cookieLocale = cookieStore.get(NEXT_LOCALE_COOKIE)?.value
  if (isAppLocale(cookieLocale)) return cookieLocale

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_LOCALE

  const { data } = await (supabase.from('users') as any)
    .select('locale')
    .eq('id', user.id)
    .maybeSingle()

  const dbLocale = (data as { locale?: string } | null)?.locale
  return isAppLocale(dbLocale) ? dbLocale : DEFAULT_LOCALE
}
