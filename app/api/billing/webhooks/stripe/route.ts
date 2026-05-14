import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseService } from '@/lib/billing/supabase-service'
import { getPlanCodeByPriceId, stripe } from '@/lib/billing/stripe'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'

function toIso(timestamp?: number | null) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

async function upsertSubscription(subscription: Stripe.Subscription, eventCreated: number) {
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
    posthogLogs.warn('Stripe subscription missing family billing context', {
      endpoint: '/api/billing/webhooks/stripe',
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId ?? 'unknown',
    })
    return
  }

  const { error: upsertError } = await supabaseService.rpc('upsert_subscription_from_stripe', {
    p_user_id: userId,
    p_family_id: familyId,
    p_stripe_subscription_id: subscription.id,
    p_plan_code: getPlanCodeByPriceId(priceId) ?? subscription.metadata?.plan_code ?? null,
    p_price_id: priceId,
    p_status: subscription.status,
    p_current_period_start: toIso(subscription.items.data[0]?.current_period_start),
    p_current_period_end: toIso(subscription.items.data[0]?.current_period_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_event_created: toIso(eventCreated)!,
  })

  if (upsertError) {
    throw upsertError
  }
}

async function markSubscriptionPastDueByInvoice(invoice: Stripe.Invoice, eventCreated: number) {
  const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
    ? invoice.parent.subscription_details.subscription
    : null
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await upsertSubscription(subscription, eventCreated)
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      posthogLogs.error('Stripe webhook rejected: missing signature configuration', {
        endpoint: '/api/billing/webhooks/stripe',
        has_signature: Boolean(signature),
        has_webhook_secret: Boolean(webhookSecret),
      })
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Configuração da assinatura do webhook ausente.' }, { status: 400 })
    }

    const payload = await request.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (error: any) {
      console.error('webhook signature verification failed', error)
      posthogLogs.warn('Stripe webhook signature verification failed', { endpoint: '/api/billing/webhooks/stripe' }, error)
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
    }

    const { error: insertEventError } = await supabaseService.from('billing_events').insert({
      stripe_event_id: event.id,
      type: event.type,
    })

    if (insertEventError) {
      if (insertEventError.code === '23505') {
        posthogLogs.info('Stripe webhook duplicate event ignored', {
          endpoint: '/api/billing/webhooks/stripe',
          stripe_event_id: event.id,
          stripe_event_type: event.type,
        })
        await flushPostHogLogs()
        return NextResponse.json({ received: true, idempotent: true })
      }

      console.error('webhook idempotency insert failed', insertEventError)
      posthogLogs.error(
        'Stripe webhook idempotency insert failed',
        {
          endpoint: '/api/billing/webhooks/stripe',
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          supabase_code: insertEventError.code,
        },
        insertEventError
      )
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Não foi possível registrar o evento.' }, { status: 500 })
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          await upsertSubscription(event.data.object as Stripe.Subscription, event.created)
          break
        }
        case 'invoice.payment_failed': {
          await markSubscriptionPastDueByInvoice(event.data.object as Stripe.Invoice, event.created)
          break
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : null

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            await upsertSubscription(subscription, event.created)
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

    posthogLogs.info('Stripe webhook processed', {
      endpoint: '/api/billing/webhooks/stripe',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
    })
    await flushPostHogLogs()

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('stripe webhook failed', error)
    posthogLogs.error('Stripe webhook failed', { endpoint: '/api/billing/webhooks/stripe' }, error)
    await flushPostHogLogs()
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
