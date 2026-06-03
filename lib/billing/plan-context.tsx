'use client'

import { createContext, useContext, useMemo } from 'react'

export type PlanTier = 'trial' | 'free' | 'paid'

interface PlanContextType {
  tier: PlanTier
  trialExpiresAt: string | null
  trialDaysLeft: number | null
}

const PlanContext = createContext<PlanContextType>({
  tier: 'paid',
  trialExpiresAt: null,
  trialDaysLeft: null,
})

export function PlanProvider({
  children,
  tier,
  trialExpiresAt,
}: {
  children: React.ReactNode
  tier: PlanTier
  trialExpiresAt: string | null
}) {
  const trialDaysLeft = useMemo(() => {
    if (!trialExpiresAt || tier !== 'trial') return null
    // eslint-disable-next-line react-hooks/purity
    return Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
  }, [trialExpiresAt, tier])

  return (
    <PlanContext.Provider value={{ tier, trialExpiresAt, trialDaysLeft }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextType {
  return useContext(PlanContext)
}
