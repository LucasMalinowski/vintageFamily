import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    const [subscriptionResult, accessResult] = await Promise.all([
      supabaseService
        .from('subscriptions')
        .select('plan_code,status,current_period_start,current_period_end,cancel_at_period_end')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
      hasBillingAccess({ familyId: profile.family_id }),
    ])

    return NextResponse.json({
      subscription: subscriptionResult.data,
      access: accessResult,
    })
  } catch (error: any) {
    console.error('billing-me failed', error)
    return NextResponse.json({ error: error?.message || 'Unexpected billing error.' }, { status: 500 })
  }
}
