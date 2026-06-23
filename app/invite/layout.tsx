import type { Metadata } from 'next'
import IntlProvider from '@/components/IntlProvider'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  return {
    title: msgs.seo.invite.title,
    description: msgs.seo.invite.description,
    robots: { index: false, follow: false },
  }
}

export default async function InviteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <IntlProvider locale={locale} messages={messages} now={new Date()} timeZone="America/Sao_Paulo">
      {children}
    </IntlProvider>
  )
}
