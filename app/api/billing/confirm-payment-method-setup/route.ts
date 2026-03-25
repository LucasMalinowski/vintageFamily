import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { stripe } from '@/lib/billing/stripe'
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
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as { setup_intent_id?: string } | null
    if (!body?.setup_intent_id) {
      return NextResponse.json({ error: 'Setup Intent inválido.' }, { status: 400 })
    }

    const [{ data: stripeCustomer }, { data: subscription }] = await Promise.all([
      supabaseService
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
      supabaseService
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
    ])

    if (!stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado para esta família.' }, { status: 404 })
    }

    const setupIntent = await stripe.setupIntents.retrieve(body.setup_intent_id)
    const customerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id
    const paymentMethodId = typeof setupIntent.payment_method === 'string'
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id

    if (setupIntent.status !== 'succeeded' || !paymentMethodId) {
      return NextResponse.json({ error: 'O método de pagamento ainda não foi confirmado.' }, { status: 400 })
    }

    if (customerId !== stripeCustomer.stripe_customer_id) {
      return NextResponse.json({ error: 'O método de pagamento não pertence a esta família.' }, { status: 403 })
    }

    await stripe.customers.update(stripeCustomer.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    if (subscription?.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        default_payment_method: paymentMethodId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('confirm-payment-method-setup failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao salvar o método de pagamento.' }, { status: 500 })
  }
}
