import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { stripe } from '@/lib/billing/stripe'
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

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.profileNotFound') }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: t('billing.adminOnly') }, { status: 403 })
    }

    const { data: stripeCustomer } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: t('billing.stripeCustomerNotFoundForFamily') }, { status: 404 })
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomer.stripe_customer_id,
      usage: 'off_session',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: auth.user.id,
        family_id: profile.family_id,
      },
    })

    if (!setupIntent.client_secret) {
      return NextResponse.json({ error: t('billing.paymentMethodSetupInitFailed') }, { status: 500 })
    }

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    })
  } catch (error: any) {
    console.error('create-payment-method-setup failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.paymentMethodUpdateUnexpectedError')) }, { status: 500 })
  }
}
