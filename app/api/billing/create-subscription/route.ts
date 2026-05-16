import { NextResponse } from 'next/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
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
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const allowed = await checkRateLimit(auth.user.id, 'create-subscription', 5)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento e tente novamente.' }, { status: 429 })
    }

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const planCode = body?.plan_code

    if (!planCode || !isPlanCode(planCode)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil do usuário não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
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
      return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 })
    }

    const { data: planSetting, error: planError } = await supabaseService
      .from('plan_settings')
      .select('is_active')
      .eq('plan_code', planCode)
      .maybeSingle()

    if (planError || !planSetting) {
      return NextResponse.json({ error: 'Configuração do plano não encontrada.' }, { status: 404 })
    }

    if (!planSetting.is_active) {
      return NextResponse.json({ error: 'Este plano está indisponível no momento.' }, { status: 400 })
    }

    if (isFoundersPlan(planCode) && !family.founders_enabled) {
      return NextResponse.json({ error: 'Sua família não está habilitada para o Plano Fundadores.' }, { status: 403 })
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
          return NextResponse.json({ error: 'Não foi possível retomar a assinatura pendente.' }, { status: 409 })
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

      return NextResponse.json({ error: 'Esta família já possui uma assinatura. Use o fluxo interno de upgrade.' }, { status: 409 })
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
      return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.' }, { status: 500 })
    }

    return NextResponse.json({
      client_secret: clientSecret,
      subscription_id: subscription.id,
    })
  } catch (error: any) {
    console.error('create-subscription failed', error)
    return NextResponse.json({ error: billingErrorMessage(error, 'Erro inesperado na cobrança.') }, { status: 500 })
  }
}
