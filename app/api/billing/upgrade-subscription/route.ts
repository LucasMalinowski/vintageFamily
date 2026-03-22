import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { isPlanCode, UPGRADE_PATHS } from '@/lib/billing/constants'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/billing/constants'
import { getPlanCodeByPriceId, getPriceIdByPlanCode, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only family admins can manage billing.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const targetPlanCode = body?.plan_code

    if (!targetPlanCode || !isPlanCode(targetPlanCode)) {
      return NextResponse.json({ error: 'Invalid plan_code.' }, { status: 400 })
    }

    const { data: currentSubscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id,plan_code,status')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!currentSubscription?.stripe_subscription_id || !currentSubscription.plan_code) {
      return NextResponse.json({ error: 'No active subscription to upgrade.' }, { status: 400 })
    }

    if (!currentSubscription.status || !ACTIVE_SUBSCRIPTION_STATUSES.has(currentSubscription.status)) {
      return NextResponse.json({ error: 'Current subscription is not eligible for upgrade.' }, { status: 400 })
    }

    const allowedUpgrades = UPGRADE_PATHS[currentSubscription.plan_code as keyof typeof UPGRADE_PATHS] || []
    if (!allowedUpgrades.includes(targetPlanCode)) {
      return NextResponse.json({ error: 'Upgrade path is not allowed.' }, { status: 400 })
    }

    const { data: planSetting } = await supabaseService
      .from('plan_settings')
      .select('is_active')
      .eq('plan_code', targetPlanCode)
      .maybeSingle()

    if (!planSetting?.is_active) {
      return NextResponse.json({ error: 'Target plan is not active.' }, { status: 400 })
    }

    if (targetPlanCode === 'founders_yearly') {
      const { data: family } = await supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle()

      if (!family?.founders_enabled) {
        return NextResponse.json({ error: 'User is not eligible for Founders plan.' }, { status: 403 })
      }
    }

    const priceId = getPriceIdByPlanCode(targetPlanCode)

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id)
    const currentItem = stripeSubscription.items.data[0]
    const currentPlanCodeFromStripe = getPlanCodeByPriceId(currentItem?.price.id ?? null)

    if (!currentItem) {
      return NextResponse.json({ error: 'Stripe subscription item not found.' }, { status: 400 })
    }

    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(stripeSubscription.status)) {
      return NextResponse.json({ error: 'Stripe subscription is not eligible for upgrade.' }, { status: 400 })
    }

    if (currentPlanCodeFromStripe !== currentSubscription.plan_code) {
      return NextResponse.json({ error: 'Subscription state is out of sync. Refresh billing data first.' }, { status: 409 })
    }

    const updated = await stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: 'create_prorations',
      payment_behavior: 'pending_if_incomplete',
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        plan_code: targetPlanCode,
      },
    })

    await supabaseService
      .from('subscriptions')
      .update({
        user_id: auth.user.id,
        plan_code: targetPlanCode,
        price_id: priceId,
        status: updated.status,
        current_period_start: updated.items.data[0]?.current_period_start
          ? new Date(updated.items.data[0].current_period_start * 1000).toISOString()
          : null,
        current_period_end: updated.items.data[0]?.current_period_end
          ? new Date(updated.items.data[0].current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: updated.cancel_at_period_end,
      })
      .eq('family_id', profile.family_id)

    return NextResponse.json({
      ok: true,
      subscription_id: updated.id,
      client_secret: updated.latest_invoice && !Array.isArray(updated.latest_invoice)
        ? (updated.latest_invoice as any)?.confirmation_secret?.client_secret ?? null
        : null,
    })
  } catch (error: any) {
    console.error('upgrade-subscription failed', error)
    return NextResponse.json({ error: error?.message || 'Unexpected billing error.' }, { status: 500 })
  }
}
