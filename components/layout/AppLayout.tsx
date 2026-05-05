'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, authStatus } = useAuth()
  const router = useRouter()
  const [showReload, setShowReload] = useState(false)

  useEffect(() => {
    // Only redirect when Supabase has definitively confirmed there is no session
    if (authStatus === 'unauthenticated') {
      router.push('/login')
    }
  }, [authStatus, router])

  useEffect(() => {
    if (authStatus !== 'loading' && authStatus !== 'error') return
    const t = setTimeout(() => setShowReload(true), 12000)
    return () => clearTimeout(t)
  }, [authStatus])

  // Show spinner while loading or during transient errors (never redirect on error)
  if (authStatus === 'loading' || authStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-coffee/30 border-t-coffee rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink/60 font-body">Carregando...</p>
          {showReload && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 rounded-lg bg-coffee text-paper text-sm font-medium"
            >
              Recarregar
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="app-main flex-1 overflow-auto bg-paper pb-[80px] md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
