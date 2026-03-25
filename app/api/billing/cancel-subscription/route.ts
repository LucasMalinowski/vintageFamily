import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

function toIso(timestamp?: number | null) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

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

    const body = (await request.json().catch(() => null)) as { cancel_at_period_end?: boolean } | null
    const cancelAtPeriodEnd = Boolean(body?.cancel_at_period_end)

    const { data: subscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada para esta família.' }, { status: 404 })
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: cancelAtPeriodEnd,
    })

    await supabaseService
      .from('subscriptions')
      .update({
        user_id: auth.user.id,
        status: updated.status,
        current_period_start: toIso(updated.items.data[0]?.current_period_start),
        current_period_end: toIso(updated.items.data[0]?.current_period_end),
        cancel_at_period_end: updated.cancel_at_period_end,
      })
      .eq('family_id', profile.family_id)

    return NextResponse.json({
      ok: true,
      cancel_at_period_end: updated.cancel_at_period_end,
      current_period_end: toIso(updated.items.data[0]?.current_period_end),
      status: updated.status,
    })
  } catch (error: any) {
    console.error('cancel-subscription failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao atualizar cancelamento.' }, { status: 500 })
  }
}
