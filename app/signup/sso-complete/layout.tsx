import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  title: 'Concluir cadastro',
  description: 'Complete seu cadastro no Florim para começar a organizar as finanças da sua família.',
  robots: { index: false, follow: false },
}

export default async function SSOCompleteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <NextIntlClientProvider locale={locale} messages={messages} getMessageFallback={({ key }) => key}>
      {children}
    </NextIntlClientProvider>
  )
}
