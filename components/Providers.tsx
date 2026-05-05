'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import PostHogProvider from '@/components/PostHogProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense>
        <PostHogProvider>{children}</PostHogProvider>
      </Suspense>
    </AuthProvider>
  )
}
