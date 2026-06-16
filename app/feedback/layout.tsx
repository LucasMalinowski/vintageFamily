import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getUserLocale } from '@/lib/i18n/getLocale'

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Envie seu feedback, sugestão ou reporte um bug para a equipe do Florim.',
  robots: { index: false, follow: false },
}

export default async function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default
  return (
    <NextIntlClientProvider locale={locale} messages={messages} getMessageFallback={({ key }) => key}>
      {children}
    </NextIntlClientProvider>
  )
}
