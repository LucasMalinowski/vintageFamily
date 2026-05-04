import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseService } from '@/lib/billing/supabase-service'
import { getPlanCodeByPriceId, stripe } from '@/lib/billing/stripe'

function toIso(timestamp?: number | null) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

async function upsertSubscription(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  const priceId = subscription.items.data[0]?.price?.id ?? null

  let userId = subscription.metadata?.user_id || null
  let familyId = subscription.metadata?.family_id || null

  if (!userId && customerId) {
    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('user_id,family_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    userId = customerRow?.user_id ?? null
    familyId = customerRow?.family_id ?? null
  }

  if (!userId || !familyId) {
    console.warn('webhook: family billing context not found for subscription', { subscriptionId: subscription.id })
    return
  }

  await supabaseService.from('subscriptions').upsert({
    user_id: userId,
    family_id: familyId,
    stripe_subscription_id: subscription.id,
    plan_code: getPlanCodeByPriceId(priceId) ?? subscription.metadata?.plan_code ?? null,
    price_id: priceId,
    status: subscription.status,
    current_period_start: toIso(subscription.items.data[0]?.current_period_start),
    current_period_end: toIso(subscription.items.data[0]?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'family_id' })
}

async function markSubscriptionPastDueByInvoice(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
    ? invoice.parent.subscription_details.subscription
    : null
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await upsertSubscription(subscription)
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Configuração da assinatura do webhook ausente.' }, { status: 400 })
    }

    const payload = await request.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (error: any) {
      console.error('webhook signature verification failed', error)
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
    }

    const { error: insertEventError } = await supabaseService.from('billing_events').insert({
      stripe_event_id: event.id,
      type: event.type,
    })

    if (insertEventError) {
      if (insertEventError.code === '23505') {
        return NextResponse.json({ received: true, idempotent: true })
      }

      console.error('webhook idempotency insert failed', insertEventError)
      return NextResponse.json({ error: 'Não foi possível registrar o evento.' }, { status: 500 })
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          await upsertSubscription(event.data.object as Stripe.Subscription)
          break
        }
        case 'invoice.payment_failed': {
          await markSubscriptionPastDueByInvoice(event.data.object as Stripe.Invoice)
          break
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : null

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            await upsertSubscription(subscription)
          }
          break
        }
        default:
          break
      }
    } catch (processingError) {
      await supabaseService
        .from('billing_events')
        .delete()
        .eq('stripe_event_id', event.id)

      throw processingError
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('stripe webhook failed', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
