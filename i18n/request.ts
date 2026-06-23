import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '@/lib/i18n/getLocale'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()
  const messages = (await import(`../messages/${locale}.json`)).default
  return { locale, messages }
})
