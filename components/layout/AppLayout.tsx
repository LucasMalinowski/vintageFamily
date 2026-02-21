'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Sidebar from '@/components/layout/Sidebar'
import { supabase } from '@/lib/supabase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, familyId } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [trialExpired, setTrialExpired] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadTrialStatus = async () => {
      if (!familyId) return
      const { data: familyRow } = await supabase
        .from('families')
        .select('trial_expires_at')
        .eq('id', familyId)
        .maybeSingle()

      if (!familyRow) return
      if (!familyRow.trial_expires_at) {
        setTrialExpired(false)
        setTrialDaysLeft(null)
        return
      }

      const expiresAt = new Date(familyRow.trial_expires_at)
      const diffMs = expiresAt.getTime() - Date.now()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      setTrialExpired(diffMs <= 0)
      setTrialDaysLeft(Math.max(daysLeft, 0))
    }

    loadTrialStatus()
  }, [familyId])

  const isBillingPage = pathname?.startsWith('/settings/billing')
  const showTrialBlock = trialExpired && !isBillingPage

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

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="app-main flex-1 overflow-auto bg-paper">
        <div className={showTrialBlock ? 'pointer-events-none select-none blur-[1px]' : ''}>
          {children}
        </div>
      </main>

      {showTrialBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="max-w-md w-full bg-bg border border-border rounded-[28px] p-8 text-center shadow-vintage">
            <h2 className="text-2xl font-serif text-coffee mb-3">Seu teste terminou</h2>
            <p className="text-sm text-ink/70 mb-6">
              Seu período de teste encerrou. Para continuar usando o Florim, finalize a assinatura.
              {trialDaysLeft !== null && trialDaysLeft > 0 ? ` Restam ${trialDaysLeft} dias.` : ''}
            </p>
            <button
              onClick={() => router.push('/settings/billing')}
              className="px-5 py-3 rounded-full bg-gold text-sidebar font-semibold text-sm hover:opacity-90 transition-vintage"
            >
              Ir para pagamento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
