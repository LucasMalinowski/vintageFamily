import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'

// RevenueCat event types that trigger subscription state changes
const ACTIVE_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION'])
const CANCELLATION_EVENT_TYPES = new Set(['CANCELLATION'])
const TERMINAL_EVENT_TYPES = new Set(['EXPIRATION'])
const ISSUE_EVENT_TYPES = new Set(['BILLING_ISSUE'])
const PAUSED_EVENT_TYPES = new Set(['SUBSCRIPTION_PAUSED'])
// These are informational only — no subscription upsert needed
const SKIP_EVENT_TYPES = new Set([
  'TRANSFER',
  'PRODUCT_CHANGE',
  'SUBSCRIBER_ALIAS',
  'NON_RENEWING_PURCHASE',
])

interface RevenueCatEvent {
  id: string
  type: string
  app_user_id: string
  original_app_user_id: string
  product_id: string
  purchased_at_ms: number | null
  expiration_at_ms: number | null
  store: string
  environment: string
  period_type?: string
}

interface RevenueCatPayload {
  api_version: string
  event: RevenueCatEvent
}

function toIso(ms: number | null | undefined): string | null {
  if (!ms) return null
  return new Date(ms).toISOString()
}

function mapEventToStatus(eventType: string): {
  status: string
  cancelAtPeriodEnd: boolean
} | null {
  if (ACTIVE_EVENT_TYPES.has(eventType)) {
    return { status: 'active', cancelAtPeriodEnd: false }
  }
  if (CANCELLATION_EVENT_TYPES.has(eventType)) {
    // Access continues until expiration_at_ms — keep 'active' with cancel flag
    return { status: 'active', cancelAtPeriodEnd: true }
  }
  if (TERMINAL_EVENT_TYPES.has(eventType)) {
    return { status: 'expired', cancelAtPeriodEnd: false }
  }
  if (ISSUE_EVENT_TYPES.has(eventType)) {
    return { status: 'past_due', cancelAtPeriodEnd: false }
  }
  if (PAUSED_EVENT_TYPES.has(eventType)) {
    return { status: 'paused', cancelAtPeriodEnd: false }
  }
  return null
}

export async function POST(request: Request) {
  try {
    // 1. Validate authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || ''
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET

    if (!webhookSecret) {
      posthogLogs.error('RevenueCat webhook rejected: missing REVENUECAT_WEBHOOK_SECRET', {
        endpoint: '/api/billing/webhooks/revenuecat',
      })
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Configuração do webhook ausente.' }, { status: 500 })
    }

    const expectedAuth = `Bearer ${webhookSecret}`
    if (authHeader !== expectedAuth) {
      posthogLogs.warn('RevenueCat webhook rejected: invalid authorization header', {
        endpoint: '/api/billing/webhooks/revenuecat',
      })
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    // 2. Parse payload
    let payload: RevenueCatPayload
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const rcEvent = payload?.event
    if (!rcEvent?.id || !rcEvent?.type || !rcEvent?.app_user_id) {
      return NextResponse.json({ error: 'Evento RevenueCat malformado.' }, { status: 400 })
    }

    // 3. Idempotency: insert event record — duplicate returns 200 immediately
    const { error: insertEventError } = await supabaseService.from('billing_events').insert({
      stripe_event_id: rcEvent.id,   // kept for schema compat (NOT NULL constraint)
      provider: 'revenuecat',
      provider_event_id: rcEvent.id,
      type: rcEvent.type,
    })

    if (insertEventError) {
      if (insertEventError.code === '23505') {
        posthogLogs.info('RevenueCat webhook duplicate event ignored', {
          endpoint: '/api/billing/webhooks/revenuecat',
          rc_event_id: rcEvent.id,
          rc_event_type: rcEvent.type,
        })
        await flushPostHogLogs()
        return NextResponse.json({ received: true, idempotent: true })
      }

      posthogLogs.error('RevenueCat webhook idempotency insert failed', {
        endpoint: '/api/billing/webhooks/revenuecat',
        rc_event_id: rcEvent.id,
        supabase_code: insertEventError.code,
      }, insertEventError)
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Não foi possível registrar o evento.' }, { status: 500 })
    }

    // 4. Skip informational events that don't change subscription state
    if (SKIP_EVENT_TYPES.has(rcEvent.type)) {
      posthogLogs.info('RevenueCat webhook informational event skipped', {
        endpoint: '/api/billing/webhooks/revenuecat',
        rc_event_id: rcEvent.id,
        rc_event_type: rcEvent.type,
      })
      await flushPostHogLogs()
      return NextResponse.json({ received: true })
    }

    try {
      // 5. Map event type to subscription status
      const statusMapping = mapEventToStatus(rcEvent.type)
      if (!statusMapping) {
        posthogLogs.info('RevenueCat webhook unhandled event type', {
          endpoint: '/api/billing/webhooks/revenuecat',
          rc_event_type: rcEvent.type,
        })
        await flushPostHogLogs()
        return NextResponse.json({ received: true })
      }

      // 6. Look up family_id from app_user_id (= Supabase user UUID)
      const appUserId = rcEvent.app_user_id
      const { data: userRow, error: userError } = await supabaseService
        .from('users')
        .select('id,family_id')
        .eq('id', appUserId)
        .maybeSingle()

      if (userError || !userRow?.family_id) {
        posthogLogs.warn('RevenueCat webhook: user/family not found', {
          endpoint: '/api/billing/webhooks/revenuecat',
          rc_event_id: rcEvent.id,
          rc_app_user_id: appUserId,
        })
        await flushPostHogLogs()
        // Return 200 to prevent RC from retrying for unknown users
        return NextResponse.json({ received: true, skipped: 'user_not_found' })
      }

      // 7. Upsert subscription with event-timestamp ordering
      const eventCreatedAt = new Date().toISOString()
      const currentPeriodStart = toIso(rcEvent.purchased_at_ms)
      const currentPeriodEnd = toIso(rcEvent.expiration_at_ms)

      const { error: upsertError } = await supabaseService.rpc(
        'upsert_subscription_from_revenuecat',
        {
          p_user_id: userRow.id,
          p_family_id: userRow.family_id,
          p_revenuecat_app_user_id: appUserId,
          p_product_id: rcEvent.product_id ?? null,
          p_status: statusMapping.status,
          p_current_period_start: currentPeriodStart,
          p_current_period_end: currentPeriodEnd,
          p_cancel_at_period_end: statusMapping.cancelAtPeriodEnd,
          p_event_created: eventCreatedAt,
        },
      )

      if (upsertError) {
        throw upsertError
      }
    } catch (processingError) {
      // Roll back idempotency record so the event can be reprocessed
      await supabaseService
        .from('billing_events')
        .delete()
        .eq('provider', 'revenuecat')
        .eq('provider_event_id', rcEvent.id)

      throw processingError
    }

    posthogLogs.info('RevenueCat webhook processed', {
      endpoint: '/api/billing/webhooks/revenuecat',
      rc_event_id: rcEvent.id,
      rc_event_type: rcEvent.type,
      rc_product_id: rcEvent.product_id,
      rc_environment: rcEvent.environment,
    })
    await flushPostHogLogs()

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('revenuecat webhook failed', error)
    posthogLogs.error('RevenueCat webhook failed', { endpoint: '/api/billing/webhooks/revenuecat' }, error)
    await flushPostHogLogs()
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
