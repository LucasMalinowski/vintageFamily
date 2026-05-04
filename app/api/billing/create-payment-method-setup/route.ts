import { NextResponse } from 'next/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
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

    const { data: stripeCustomer } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado para esta família.' }, { status: 404 })
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
      return NextResponse.json({ error: 'Não foi possível iniciar a atualização do método de pagamento.' }, { status: 500 })
    }

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    })
  } catch (error: any) {
    console.error('create-payment-method-setup failed', error)
    return NextResponse.json({ error: billingErrorMessage(error, 'Erro inesperado ao iniciar atualização de pagamento.') }, { status: 500 })
  }
}
