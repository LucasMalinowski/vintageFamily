'use client'

import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import type { ReactNode } from 'react'

// Server Components can't pass functions as props to Client Components (RSC
// can't serialize them), so getMessageFallback has to be defined here instead
// of inline at each call site in a server layout.
export default function IntlProvider({
  locale,
  messages,
  now,
  timeZone,
  children,
}: {
  locale: string
  messages: AbstractIntlMessages
  now: Date
  timeZone: string
  children: ReactNode
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      now={now}
      timeZone={timeZone}
      getMessageFallback={({ key }) => key}
    >
      {children}
    </NextIntlClientProvider>
  )
}
