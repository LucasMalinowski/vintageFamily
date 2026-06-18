import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'
import { checkRateLimit } from '@/lib/billing/rate-limit'

export async function POST(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const allowed = await checkRateLimit(auth.user.id, 'create-portal-session', 5)
    if (!allowed) {
      return NextResponse.json({ error: t('billing.tooManyAttempts') }, { status: 429 })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.profileNotFound') }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: t('billing.adminOnly') }, { status: 403 })
    }

    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json({ error: t('billing.stripeCustomerNotFound') }, { status: 404 })
    }

    if (!process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID) {
      return NextResponse.json({ error: t('billing.portalConfigMissing') }, { status: 500 })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/settings/billing`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (error: any) {
    console.error('create-portal-session failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.unexpectedError')) }, { status: 500 })
  }
}
