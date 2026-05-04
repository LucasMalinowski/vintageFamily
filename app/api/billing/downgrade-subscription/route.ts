import { NextResponse } from 'next/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { ACTIVE_SUBSCRIPTION_STATUSES, DOWNGRADE_PATHS, isPlanCode } from '@/lib/billing/constants'
import { getPlanCodeByPriceId, getPriceIdByPlanCode, stripe } from '@/lib/billing/stripe'
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

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const targetPlanCode = body?.plan_code

    if (!targetPlanCode || !isPlanCode(targetPlanCode)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    const { data: currentSubscription } = await supabaseService
      .from('subscriptions')
      .select('stripe_subscription_id,plan_code,status')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!currentSubscription?.stripe_subscription_id || !currentSubscription.plan_code) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa disponível para downgrade.' }, { status: 400 })
    }

    if (!currentSubscription.status || !ACTIVE_SUBSCRIPTION_STATUSES.has(currentSubscription.status)) {
      return NextResponse.json({ error: 'A assinatura atual não pode ser alterada.' }, { status: 400 })
    }

    const allowedDowngrades = DOWNGRADE_PATHS[currentSubscription.plan_code as keyof typeof DOWNGRADE_PATHS] || []
    if (!allowedDowngrades.includes(targetPlanCode)) {
      return NextResponse.json({ error: 'Este downgrade não é permitido.' }, { status: 400 })
    }

    const { data: planSetting } = await supabaseService
      .from('plan_settings')
      .select('is_active')
      .eq('plan_code', targetPlanCode)
      .maybeSingle()

    if (!planSetting?.is_active) {
      return NextResponse.json({ error: 'O plano de destino está indisponível.' }, { status: 400 })
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id, {
      expand: ['schedule'],
    })

    const currentItem = stripeSubscription.items.data[0]
    const currentPlanCodeFromStripe = getPlanCodeByPriceId(currentItem?.price.id ?? null)

    if (!currentItem) {
      return NextResponse.json({ error: 'Item da assinatura não encontrado no Stripe.' }, { status: 400 })
    }

    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(stripeSubscription.status)) {
      return NextResponse.json({ error: 'A assinatura no Stripe não pode ser alterada agora.' }, { status: 400 })
    }

    if (currentPlanCodeFromStripe !== currentSubscription.plan_code) {
      return NextResponse.json({ error: 'A assinatura está fora de sincronia. Atualize os dados e tente novamente.' }, { status: 409 })
    }

    const targetPriceId = getPriceIdByPlanCode(targetPlanCode)
    const quantity = currentItem.quantity ?? 1
    const currentPeriodStart = currentItem.current_period_start
    const currentPeriodEnd = currentItem.current_period_end

    if (!currentPeriodStart || !currentPeriodEnd) {
      return NextResponse.json({ error: 'Período atual da assinatura não encontrado.' }, { status: 400 })
    }

    let scheduleId = typeof stripeSubscription.schedule === 'string'
      ? stripeSubscription.schedule
      : stripeSubscription.schedule?.id ?? null

    if (!scheduleId) {
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: stripeSubscription.id,
      })
      scheduleId = schedule.id
    }

    await stripe.subscriptionSchedules.update(scheduleId, {
      end_behavior: 'release',
      phases: [
        {
          start_date: currentPeriodStart,
          end_date: currentPeriodEnd,
          items: [
            {
              price: currentItem.price.id,
              quantity,
            },
          ],
        },
        {
          start_date: currentPeriodEnd,
          items: [
            {
              price: targetPriceId,
              quantity,
            },
          ],
        },
      ],
    })

    return NextResponse.json({
      ok: true,
      scheduled_change: {
        target_plan: targetPlanCode,
        effective_at: new Date(currentPeriodEnd * 1000).toISOString(),
      },
    })
  } catch (error: any) {
    console.error('downgrade-subscription failed', error)
    return NextResponse.json({ error: billingErrorMessage(error, 'Erro inesperado na cobrança.') }, { status: 500 })
  }
}
