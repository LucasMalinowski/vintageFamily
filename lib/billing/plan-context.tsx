'use client'

import { createContext, useContext } from 'react'

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
  const trialDaysLeft =
    trialExpiresAt && tier === 'trial'
      ? Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null

  return (
    <PlanContext.Provider value={{ tier, trialExpiresAt, trialDaysLeft }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan(): PlanContextType {
  return useContext(PlanContext)
}
