import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  title: 'Planos e preços',
  description: 'Conheça os planos do Florim. Comece grátis por 30 dias e organize as finanças da sua família com o plano que cabe no seu bolso.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Planos Florim - Gestão financeira familiar',
    description: 'Teste grátis por 30 dias. Assine e controle as finanças da família com Florim Pro.',
    url: 'https://florim.app/pricing',
  },
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <NextIntlClientProvider locale={locale} messages={messages} getMessageFallback={({ key }) => key}>
      {children}
    </NextIntlClientProvider>
  )
}
