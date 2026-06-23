import type { Metadata } from 'next'
import IntlProvider from '@/components/IntlProvider'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.pricing
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: '/pricing' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app/pricing',
    },
  }
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <IntlProvider locale={locale} messages={messages} now={new Date()} timeZone="America/Sao_Paulo">
      {children}
    </IntlProvider>
  )
}
