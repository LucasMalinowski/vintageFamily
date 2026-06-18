import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { checkRateLimit } from '@/lib/billing/rate-limit'
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

    const allowed = await checkRateLimit(auth.user.id, 'clear-scheduled-change', 5)
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

    const { data: currentSubscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!currentSubscription?.stripe_subscription_id) {
      return NextResponse.json({ error: t('billing.noActiveSubscription') }, { status: 404 })
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id, {
      expand: ['schedule'],
    })

    const scheduleId = typeof stripeSubscription.schedule === 'string'
      ? stripeSubscription.schedule
      : stripeSubscription.schedule?.id ?? null

    if (!scheduleId) {
      return NextResponse.json({ ok: true, cleared: false })
    }

    await stripe.subscriptionSchedules.release(scheduleId)

    return NextResponse.json({ ok: true, cleared: true })
  } catch (error: any) {
    console.error('clear-scheduled-change failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.clearScheduledChangeUnexpectedError')) }, { status: 500 })
  }
}
