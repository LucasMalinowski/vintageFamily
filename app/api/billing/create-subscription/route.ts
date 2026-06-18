import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { isFoundersPlan, isPlanCode } from '@/lib/billing/constants'
import { BLOCKING_SUBSCRIPTION_STATUSES, getPriceIdByPlanCode, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'
import { checkRateLimit } from '@/lib/billing/rate-limit'

function extractClientSecret(subscription: any) {
  const invoiceConfirmationSecret = subscription?.latest_invoice?.confirmation_secret?.client_secret
  if (typeof invoiceConfirmationSecret === 'string') {
    return invoiceConfirmationSecret
  }

  const pendingSetupIntentSecret = subscription?.pending_setup_intent?.client_secret
  if (typeof pendingSetupIntentSecret === 'string') {
    return pendingSetupIntentSecret
  }

  return null
}

async function retrieveSubscriptionForCheckout(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
  })
}

export async function POST(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const allowed = await checkRateLimit(auth.user.id, 'create-subscription', 5)
    if (!allowed) {
      return NextResponse.json({ error: t('billing.tooManyAttempts') }, { status: 429 })
    }

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const planCode = body?.plan_code

    if (!planCode || !isPlanCode(planCode)) {
      return NextResponse.json({ error: t('billing.invalidPlan') }, { status: 400 })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.userProfileNotFound') }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: t('billing.adminOnly') }, { status: 403 })
    }

    const [{ data: existingSubscription }, { data: family }] = await Promise.all([
      supabaseService
        .from('subscriptions')
        .select('status,plan_code')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
      supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle(),
    ])

    if (!family) {
      return NextResponse.json({ error: t('billing.familyNotFound') }, { status: 404 })
    }

    const { data: planSetting, error: planError } = await supabaseService
      .from('plan_settings')
      .select('is_active')
      .eq('plan_code', planCode)
      .maybeSingle()

    if (planError || !planSetting) {
      return NextResponse.json({ error: t('billing.planSettingNotFound') }, { status: 404 })
    }

    if (!planSetting.is_active) {
      return NextResponse.json({ error: t('billing.planUnavailableNow') }, { status: 400 })
    }

    if (isFoundersPlan(planCode) && !family.founders_enabled) {
      return NextResponse.json({ error: t('billing.foundersNotEnabled') }, { status: 403 })
    }

    let stripeCustomerId: string | null = null
    const { data: stripeCustomerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    stripeCustomerId = stripeCustomerRow?.stripe_customer_id ?? null

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          user_id: auth.user.id,
          family_id: profile.family_id,
        },
      })

      stripeCustomerId = customer.id

      await supabaseService.from('stripe_customers').upsert({
        user_id: auth.user.id,
        family_id: profile.family_id,
        stripe_customer_id: customer.id,
      }, { onConflict: 'family_id' })
    }

    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 100,
    })

    const blockingStripeSubscription = stripeSubscriptions.data.find((subscription) =>
      BLOCKING_SUBSCRIPTION_STATUSES.has(subscription.status),
    )

    if (blockingStripeSubscription) {
      if (blockingStripeSubscription.status === 'incomplete') {
        const checkoutSubscription = await retrieveSubscriptionForCheckout(blockingStripeSubscription.id)
        const clientSecret = extractClientSecret(checkoutSubscription)

        if (!clientSecret) {
          return NextResponse.json({ error: t('billing.resumePendingSubscriptionFailed') }, { status: 409 })
        }

        await supabaseService.from('subscriptions').upsert({
          user_id: auth.user.id,
          family_id: profile.family_id,
          stripe_subscription_id: checkoutSubscription.id,
          plan_code: getPriceIdByPlanCode(planCode) === checkoutSubscription.items.data[0]?.price.id ? planCode : existingSubscription?.plan_code ?? planCode,
          price_id: checkoutSubscription.items.data[0]?.price.id ?? null,
          status: checkoutSubscription.status,
          current_period_start: checkoutSubscription.items.data[0]?.current_period_start
            ? new Date(checkoutSubscription.items.data[0].current_period_start * 1000).toISOString()
            : null,
          current_period_end: checkoutSubscription.items.data[0]?.current_period_end
            ? new Date(checkoutSubscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: checkoutSubscription.cancel_at_period_end,
        }, { onConflict: 'family_id' })

        return NextResponse.json({
          client_secret: clientSecret,
          subscription_id: checkoutSubscription.id,
          resumed: true,
        })
      }

      return NextResponse.json({ error: t('billing.familyAlreadyHasSubscription') }, { status: 409 })
    }

    const priceId = getPriceIdByPlanCode(planCode)

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        user_id: auth.user.id,
        plan_code: planCode,
        family_id: profile.family_id,
      },
      expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
    })

    const clientSecret = extractClientSecret(subscription)

    await supabaseService.from('subscriptions').upsert({
      user_id: auth.user.id,
      family_id: profile.family_id,
      stripe_subscription_id: subscription.id,
      plan_code: planCode,
      price_id: priceId,
      status: subscription.status,
      current_period_start: subscription.items.data[0]?.current_period_start
        ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.items.data[0]?.current_period_end
        ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, { onConflict: 'family_id' })

    if (!clientSecret) {
      console.error('create-subscription: missing client secret', { subscriptionId: subscription.id })
      return NextResponse.json({ error: t('billing.paymentInitFailed') }, { status: 500 })
    }

    return NextResponse.json({
      client_secret: clientSecret,
      subscription_id: subscription.id,
    })
  } catch (error: any) {
    console.error('create-subscription failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.unexpectedError')) }, { status: 500 })
  }
}
