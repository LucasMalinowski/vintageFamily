import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { supabaseService } from '@/lib/billing/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    let foundersEligible = false

    const plansQuery = supabaseService
      .from('plan_settings')
      .select('plan_code,is_visible,is_active')
      .order('created_at', { ascending: true })

    if (!accessToken) {
      const plansResult = await plansQuery

      return NextResponse.json({
        founders_eligible: foundersEligible,
        plans: plansResult.data ?? [],
      })
    }

    const auth = await requireUserByAccessToken(accessToken, locale)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.profileNotFound') }, { status: 404 })
    }

    const [familyResult, plansResult] = await Promise.all([
      supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle(),
      plansQuery,
    ])

    foundersEligible = Boolean(familyResult.data?.founders_enabled)

    return NextResponse.json({
      founders_eligible: foundersEligible,
      plans: plansResult.data ?? [],
    })
  } catch (error: any) {
    console.error('billing-eligibility failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.unexpectedError')) }, { status: 500 })
  }
}
