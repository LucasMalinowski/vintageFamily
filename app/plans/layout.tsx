import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.plansLayout
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: '/plans' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app/plans',
    },
  }
}

export default async function PlansLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <NextIntlClientProvider locale={locale} messages={messages} getMessageFallback={({ key }) => key}>
      {children}
    </NextIntlClientProvider>
  )
}
