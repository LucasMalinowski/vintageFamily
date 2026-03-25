import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/billing/constants'
import { getPlanCodeByPriceId, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

function toIso(timestamp?: number | null) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const { data: subscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id,plan_code,price_id,status,current_period_start,current_period_end,cancel_at_period_end')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ ready: false, status: null })
    }

    if (subscription.status && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      return NextResponse.json({ ready: true, status: subscription.status })
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)

    await supabaseService
      .from('subscriptions')
      .update({
        user_id: auth.user.id,
        plan_code: getPlanCodeByPriceId(stripeSubscription.items.data[0]?.price.id ?? null) ?? subscription.plan_code,
        price_id: stripeSubscription.items.data[0]?.price.id ?? subscription.price_id,
        status: stripeSubscription.status,
        current_period_start: toIso(stripeSubscription.items.data[0]?.current_period_start),
        current_period_end: toIso(stripeSubscription.items.data[0]?.current_period_end),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      })
      .eq('family_id', profile.family_id)

    return NextResponse.json({
      ready: ACTIVE_SUBSCRIPTION_STATUSES.has(stripeSubscription.status),
      status: stripeSubscription.status,
    })
  } catch (error: any) {
    console.error('checkout-status failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado na cobrança.' }, { status: 500 })
  }
}
