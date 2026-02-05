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
        .select('created_at')
        .eq('id', familyId)
        .maybeSingle()

      if (!familyRow?.created_at) return
      const createdAt = new Date(familyRow.created_at)
      const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      const diffMs = expiresAt.getTime() - Date.now()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      setTrialExpired(diffMs <= 0)
      setTrialDaysLeft(Math.max(daysLeft, 0))
    }

    loadTrialStatus()
  }, [familyId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
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

  const isBillingPage = useMemo(() => pathname?.startsWith('/settings/billing'), [pathname])
  const showTrialBlock = trialExpired && !isBillingPage

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-0 md:ml-72 bg-paper">
        <div className={\`\${showTrialBlock ? 'pointer-events-none select-none blur-[1px]' : ''} min-h-screen\`}>
          <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-10">
            {children}
          </div>
        </div>
      </main>

      {showTrialBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="max-w-md w-full bg-paper-2 border border-border rounded-[28px] p-8 text-center shadow-vintage">
            <h2 className="text-2xl font-serif text-coffee mb-3">Seu teste terminou</h2>
            <p className="text-sm text-ink/70 mb-6">
              O período de 7 dias encerrou. Para continuar usando o Florim, finalize a assinatura.
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
