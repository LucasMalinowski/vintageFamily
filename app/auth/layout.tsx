import type { Metadata } from 'next'
import IntlProvider from '@/components/IntlProvider'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <IntlProvider locale={locale} messages={messages} now={new Date()} timeZone="America/Sao_Paulo">
      {children}
    </IntlProvider>
  )
}
