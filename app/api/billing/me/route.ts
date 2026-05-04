import { NextResponse } from 'next/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { getPlanCodeByPriceId, stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function GET(request: Request) {
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

    const [subscriptionResult, familyResult, accessResult] = await Promise.all([
      supabaseService
        .from('subscriptions')
        .select('stripe_subscription_id,plan_code,status,current_period_start,current_period_end,cancel_at_period_end')
        .eq('family_id', profile.family_id)
        .maybeSingle(),
      supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle(),
      hasBillingAccess({ familyId: profile.family_id }),
    ])

    let scheduledChange: { target_plan: string | null; effective_at: string | null } | null = null

    if (subscriptionResult.data?.stripe_subscription_id) {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionResult.data.stripe_subscription_id, {
        expand: ['schedule'],
      })
      const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end

      const schedule = typeof stripeSubscription.schedule === 'string'
        ? await stripe.subscriptionSchedules.retrieve(stripeSubscription.schedule)
        : stripeSubscription.schedule

      const futurePhase = currentPeriodEnd
        ? schedule?.phases?.find((phase) => phase.start_date >= currentPeriodEnd)
        : null
      const futurePriceId = futurePhase?.items?.[0]?.price as string | undefined

      if (futurePhase?.start_date && futurePriceId) {
        scheduledChange = {
          target_plan: getPlanCodeByPriceId(futurePriceId),
          effective_at: new Date(futurePhase.start_date * 1000).toISOString(),
        }
      }
    }

    return NextResponse.json({
      subscription: subscriptionResult.data
        ? {
            plan_code: subscriptionResult.data.plan_code,
            status: subscriptionResult.data.status,
            current_period_start: subscriptionResult.data.current_period_start,
            current_period_end: subscriptionResult.data.current_period_end,
            cancel_at_period_end: subscriptionResult.data.cancel_at_period_end,
          }
        : null,
      billing: {
        can_manage: profile.role === 'admin',
        founders_eligible: Boolean(familyResult.data?.founders_enabled),
        scheduled_change: scheduledChange,
      },
      access: accessResult,
    })
  } catch (error: any) {
    console.error('billing-me failed', error)
    return NextResponse.json({ error: billingErrorMessage(error, 'Erro inesperado na cobrança.') }, { status: 500 })
  }
}
