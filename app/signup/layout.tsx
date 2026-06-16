import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta no Florim e comece a organizar as finanças da sua família. Grátis por 30 dias.',
  robots: { index: false, follow: false },
}

export default async function SignupLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <NextIntlClientProvider locale={locale} messages={messages} getMessageFallback={({ key }) => key}>
      {children}
    </NextIntlClientProvider>
  )
}
