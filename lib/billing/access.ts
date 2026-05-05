import { supabaseService } from '@/lib/billing/supabase-service'
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/billing/constants'

export async function hasBillingAccess(args: { familyId: string }) {
  const [subscriptionResult, familyResult] = await Promise.all([
    supabaseService
      .from('subscriptions')
      .select('status,current_period_end,cancel_at_period_end')
      .eq('family_id', args.familyId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseService
      .from('families')
      .select('trial_expires_at,lifetime_access,founders_enabled')
      .eq('id', args.familyId)
      .maybeSingle(),
  ])

  const subscription = subscriptionResult.data as
    | {
        status: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean | null
      }
    | null
    | undefined

  const trialExpiresAt = familyResult.data?.trial_expires_at
  const hasLifetimeAccess = Boolean(familyResult.data?.lifetime_access)
  const foundersEnabled = Boolean(familyResult.data?.founders_enabled)

  const hasValidSubscription = Boolean(subscription?.status && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status))
  const hasActiveTrial = Boolean(trialExpiresAt && new Date(trialExpiresAt).getTime() > Date.now())
  const isPaidTier = hasLifetimeAccess || hasValidSubscription
  const isFreeTier = !isPaidTier && !hasActiveTrial

  return {
    hasLifetimeAccess,
    foundersEnabled,
    hasValidSubscription,
    hasActiveTrial,
    hasAccess: true, // Free tier always has access; feature limits enforced per-feature
    isPaidTier,
    isFreeTier,
    trialExpiresAt,
  }
}
