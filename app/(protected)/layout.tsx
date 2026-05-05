import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'

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

  if (!access.hasAccess) {
    redirect('/pricing')
  }

  return <>{children}</>
}
