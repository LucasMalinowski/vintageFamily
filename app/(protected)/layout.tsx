import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { PlanProvider, type PlanTier } from '@/lib/billing/plan-context'
import { FamilyPickerOverlay } from '@/components/FamilyPickerOverlay'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileByUserId(user.id)
  if (!profile) {
    redirect('/login')
  }

  const access = await hasBillingAccess({ familyId: profile.family_id })

  const tier: PlanTier = access.isPaidTier ? 'paid' : access.hasActiveTrial ? 'trial' : 'free'

  return (
    <PlanProvider tier={tier} trialExpiresAt={access.trialExpiresAt ?? null}>
      <FamilyPickerOverlay />
      {children}
    </PlanProvider>
  )
}
