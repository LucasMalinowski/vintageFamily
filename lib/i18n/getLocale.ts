import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DEFAULT_LOCALE, NEXT_LOCALE_COOKIE, isAppLocale, type AppLocale } from '@/lib/i18n/locales'

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, NEXT_LOCALE_COOKIE, type AppLocale } from '@/lib/i18n/locales'

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
