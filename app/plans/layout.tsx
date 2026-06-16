import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Veja os planos do Florim. Compare recursos e escolha o melhor para a sua família.',
  alternates: { canonical: '/plans' },
  openGraph: {
    title: 'Planos Florim',
    description: 'Compare os planos do Florim e comece grátis por 30 dias.',
    url: 'https://florim.app/plans',
  },
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
