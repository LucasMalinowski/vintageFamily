import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAccessTokenFromCookieStore, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const accessToken = getAccessTokenFromCookieStore(cookieStore)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    redirect('/login')
  }

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile) {
    redirect('/login')
  }

  const access = await hasBillingAccess({
    familyId: profile.family_id,
  })

  if (!access.hasAccess) {
    redirect('/pricing')
  }

  return <>{children}</>
}
