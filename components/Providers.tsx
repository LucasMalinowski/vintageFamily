'use client'

import { Suspense } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from '@/components/AuthProvider'
import PostHogProvider from '@/components/PostHogProvider'
import ConsentSyncer from '@/components/ConsentSyncer'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <AuthProvider>
        <ConsentSyncer />
        <Suspense>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
