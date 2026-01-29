'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isTrialExpired, trialEndsAt } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-coffee/30 border-t-coffee rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink/60 font-body">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isPaymentRoute = pathname.startsWith('/settings/payment')

  if (isTrialExpired && !isPaymentRoute) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl bg-paper-2 border border-border shadow-soft rounded-vintage p-8">
          <h1 className="text-3xl font-serif text-olive mb-3">Seu período de teste terminou</h1>
          <p className="text-ink/70 mb-6">
            O acesso completo está pausado. Para continuar usando o Florim, escolha um plano e finalize sua assinatura.
          </p>
          {trialEndsAt && (
            <p className="text-sm text-ink/50 mb-6">
              Encerrado em {trialEndsAt.toLocaleDateString('pt-BR')}
            </p>
          )}
          <button
            onClick={() => router.push('/settings/payment')}
            className="px-6 py-3 rounded-full bg-olive text-white hover:bg-olive/90 transition-vintage"
          >
            Gerenciar assinatura
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-0 md:ml-72">
        {children}
      </main>
    </div>
  )
}
