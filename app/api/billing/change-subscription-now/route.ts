import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { DOWNGRADE_PATHS, isPlanCode, UPGRADE_PATHS } from '@/lib/billing/constants'
import { getPlanCodeByPriceId, getPriceIdByPlanCode, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

function getProrationAmount(invoice: any) {
  return (invoice?.lines?.data || []).reduce((sum: number, line: any) => {
    if (line?.parent?.subscription_item_details?.proration) {
      return sum + (line.amount || 0)
    }

    return sum
  }, 0)
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
      return NextResponse.json({ error: 'Perfil do usuário não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as { plan_code?: string; proration_date?: number } | null
    const targetPlanCode = body?.plan_code
    const prorationDate = typeof body?.proration_date === 'number' ? body.proration_date : Math.floor(Date.now() / 1000)

    if (!targetPlanCode || !isPlanCode(targetPlanCode)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    const [{ data: currentSubscription }, { data: family }, { data: planSetting }] = await Promise.all([
      supabaseService
        .from('subscriptions')
        .select('stripe_subscription_id,plan_code')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
      supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle(),
      supabaseService
        .from('plan_settings')
        .select('is_active')
        .eq('plan_code', targetPlanCode)
        .maybeSingle(),
    ])

    if (!currentSubscription?.stripe_subscription_id || !currentSubscription.plan_code) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 400 })
    }

    if (!planSetting?.is_active) {
      return NextResponse.json({ error: 'O plano de destino está indisponível.' }, { status: 400 })
    }

    if (targetPlanCode === 'founders_yearly' && !family?.founders_enabled) {
      return NextResponse.json({ error: 'Sua família não está habilitada para o Plano Fundadores.' }, { status: 403 })
    }

    const currentPlanCode = currentSubscription.plan_code as keyof typeof UPGRADE_PATHS
    const isUpgrade = UPGRADE_PATHS[currentPlanCode]?.includes(targetPlanCode)
    const isDowngrade = DOWNGRADE_PATHS[currentPlanCode]?.includes(targetPlanCode)

    if (!isUpgrade && !isDowngrade) {
      return NextResponse.json({ error: 'Esta alteração de plano não é permitida.' }, { status: 400 })
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id, {
      expand: ['latest_invoice', 'latest_invoice.confirmation_secret'],
    })

    const currentItem = stripeSubscription.items.data[0]
    const currentPlanCodeFromStripe = getPlanCodeByPriceId(currentItem?.price.id ?? null)

    if (!currentItem) {
      return NextResponse.json({ error: 'Item da assinatura não encontrado no Stripe.' }, { status: 400 })
    }

    if (currentPlanCodeFromStripe !== currentSubscription.plan_code) {
      return NextResponse.json({ error: 'A assinatura está fora de sincronia. Atualize os dados e tente novamente.' }, { status: 409 })
    }

    const targetPriceId = getPriceIdByPlanCode(targetPlanCode)
    const updated = await stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: targetPriceId, quantity: currentItem.quantity ?? 1 }],
      proration_behavior: 'create_prorations',
      proration_date: prorationDate,
      payment_behavior: 'pending_if_incomplete',
      expand: ['latest_invoice', 'latest_invoice.confirmation_secret'],
    })

    const latestInvoice = updated.latest_invoice && !Array.isArray(updated.latest_invoice)
      ? updated.latest_invoice as any
      : null

    await supabaseService
      .from('subscriptions')
      .update({
        user_id: auth.user.id,
        plan_code: targetPlanCode,
        price_id: targetPriceId,
        status: updated.status,
        current_period_start: updated.items.data[0]?.current_period_start
          ? new Date(updated.items.data[0].current_period_start * 1000).toISOString()
          : null,
        current_period_end: updated.items.data[0]?.current_period_end
          ? new Date(updated.items.data[0].current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: updated.cancel_at_period_end,
      })
      .eq('family_id', profile.family_id)

    return NextResponse.json({
      ok: true,
      client_secret: latestInvoice?.confirmation_secret?.client_secret ?? null,
      change_preview: {
        current_plan: currentSubscription.plan_code,
        target_plan: targetPlanCode,
        immediate_adjustment: latestInvoice ? getProrationAmount(latestInvoice) : 0,
        currency: latestInvoice?.currency ?? updated.currency ?? 'brl',
        target_recurring_amount: updated.items.data[0]?.price.unit_amount ?? null,
      },
    })
  } catch (error: any) {
    console.error('change-subscription-now failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao alterar plano.' }, { status: 500 })
  }
}
