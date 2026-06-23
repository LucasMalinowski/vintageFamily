import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import IntlProvider from '@/components/IntlProvider'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { PlanProvider, type PlanTier } from '@/lib/billing/plan-context'
import { FamilyPickerOverlay } from '@/components/FamilyPickerOverlay'
import { getUserLocale } from '@/lib/i18n/getLocale'

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

  const locale = await getUserLocale()
  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <IntlProvider
      locale={locale}
      messages={messages}
      now={new Date()}
      timeZone="America/Sao_Paulo"
    >
      <PlanProvider tier={tier} trialExpiresAt={access.trialExpiresAt ?? null}>
        <FamilyPickerOverlay />
        {children}
      </PlanProvider>
    </IntlProvider>
  )
}
