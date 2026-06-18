import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { checkRateLimit } from '@/lib/billing/rate-limit'
import { isFoundersPlan, isPlanCode, UPGRADE_PATHS } from '@/lib/billing/constants'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/billing/constants'
import { getPlanCodeByPriceId, getPriceIdByPlanCode, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function POST(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const allowed = await checkRateLimit(auth.user.id, 'upgrade-subscription', 5)
    if (!allowed) {
      return NextResponse.json({ error: t('billing.tooManyAttempts') }, { status: 429 })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.userProfileNotFound') }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: t('billing.adminOnly') }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const targetPlanCode = body?.plan_code

    if (!targetPlanCode || !isPlanCode(targetPlanCode)) {
      return NextResponse.json({ error: t('billing.invalidPlan') }, { status: 400 })
    }

    const { data: currentSubscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id,plan_code,status')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!currentSubscription?.stripe_subscription_id || !currentSubscription.plan_code) {
      return NextResponse.json({ error: t('billing.noActiveSubscriptionForUpgrade') }, { status: 400 })
    }

    if (!currentSubscription.status || !ACTIVE_SUBSCRIPTION_STATUSES.has(currentSubscription.status)) {
      return NextResponse.json({ error: t('billing.currentSubscriptionCannotBeUpgraded') }, { status: 400 })
    }

    const allowedUpgrades = UPGRADE_PATHS[currentSubscription.plan_code as keyof typeof UPGRADE_PATHS] || []
    if (!allowedUpgrades.includes(targetPlanCode)) {
      return NextResponse.json({ error: t('billing.upgradeNotAllowed') }, { status: 400 })
    }

    const { data: planSetting } = await supabaseService
      .from('plan_settings')
      .select('is_active')
      .eq('plan_code', targetPlanCode)
      .maybeSingle()

    if (!planSetting?.is_active) {
      return NextResponse.json({ error: t('billing.targetPlanUnavailable') }, { status: 400 })
    }

    if (isFoundersPlan(targetPlanCode)) {
      const { data: family } = await supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle()

      if (!family?.founders_enabled) {
        return NextResponse.json({ error: t('billing.foundersNotEnabled') }, { status: 403 })
      }
    }

    const priceId = getPriceIdByPlanCode(targetPlanCode)

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id)
    const currentItem = stripeSubscription.items.data[0]
    const currentPlanCodeFromStripe = getPlanCodeByPriceId(currentItem?.price.id ?? null)

    if (!currentItem) {
      return NextResponse.json({ error: t('billing.subscriptionItemNotFound') }, { status: 400 })
    }

    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(stripeSubscription.status)) {
      return NextResponse.json({ error: t('billing.stripeSubscriptionCannotBeChangedNow') }, { status: 400 })
    }

    if (currentPlanCodeFromStripe !== currentSubscription.plan_code) {
      return NextResponse.json({ error: t('billing.subscriptionOutOfSync') }, { status: 409 })
    }

    const updated = await stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: 'create_prorations',
      payment_behavior: 'pending_if_incomplete',
      expand: ['latest_invoice', 'latest_invoice.confirmation_secret'],
    })

    const latestInvoice = updated.latest_invoice && !Array.isArray(updated.latest_invoice)
      ? updated.latest_invoice as any
      : null

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
      client_secret: latestInvoice?.confirmation_secret?.client_secret ?? null,
      upgrade_preview: {
        current_plan: currentSubscription.plan_code,
        target_plan: targetPlanCode,
        amount_due: latestInvoice?.amount_due ?? 0,
        currency: latestInvoice?.currency ?? updated.currency ?? 'brl',
        current_recurring_amount: currentItem.price.unit_amount ?? null,
        target_recurring_amount: updated.items.data[0]?.price.unit_amount ?? null,
      },
    })
  } catch (error: any) {
    console.error('upgrade-subscription failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.unexpectedError')) }, { status: 500 })
  }
}
