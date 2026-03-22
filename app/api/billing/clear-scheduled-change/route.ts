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
      return NextResponse.json({ error: 'Perfil do usuário não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
    }

    const { data: currentSubscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!currentSubscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 404 })
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
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao remover alteração agendada.' }, { status: 500 })
  }
}
