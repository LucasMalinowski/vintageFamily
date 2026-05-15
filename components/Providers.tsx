'use client'

import { Suspense } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import PostHogProvider from '@/components/PostHogProvider'
import ConsentSyncer from '@/components/ConsentSyncer'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConsentSyncer />
      <Suspense>
        <PostHogProvider>{children}</PostHogProvider>
      </Suspense>
    </AuthProvider>
  )
}
