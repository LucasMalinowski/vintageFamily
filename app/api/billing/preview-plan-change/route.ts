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

    const body = (await request.json().catch(() => null)) as { plan_code?: string } | null
    const targetPlanCode = body?.plan_code

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

    const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id)
    const currentItem = stripeSubscription.items.data[0]
    const currentPlanCodeFromStripe = getPlanCodeByPriceId(currentItem?.price.id ?? null)

    if (!currentItem) {
      return NextResponse.json({ error: 'Item da assinatura não encontrado no Stripe.' }, { status: 400 })
    }

    if (currentPlanCodeFromStripe !== currentSubscription.plan_code) {
      return NextResponse.json({ error: 'A assinatura está fora de sincronia. Atualize os dados e tente novamente.' }, { status: 409 })
    }

    const prorationDate = Math.floor(Date.now() / 1000)
    const targetPriceId = getPriceIdByPlanCode(targetPlanCode)
    const targetPrice = await stripe.prices.retrieve(targetPriceId)
    const customerId = typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : stripeSubscription.customer?.id

    if (!customerId) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado.' }, { status: 400 })
    }

    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: stripeSubscription.id,
      subscription_details: {
        items: [
          {
            id: currentItem.id,
            price: targetPriceId,
            quantity: currentItem.quantity ?? 1,
          },
        ],
        proration_date: prorationDate,
      },
    })

    return NextResponse.json({
      preview: {
        current_plan: currentSubscription.plan_code,
        target_plan: targetPlanCode,
        proration_date: prorationDate,
        currency: preview.currency ?? stripeSubscription.currency ?? 'brl',
        immediate_adjustment: getProrationAmount(preview),
        next_invoice_total: preview.total ?? 0,
        target_recurring_amount: targetPrice.unit_amount ?? null,
      },
    })
  } catch (error: any) {
    console.error('preview-plan-change failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao simular alteração.' }, { status: 500 })
  }
}
