import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUsageCounters } from '@/lib/billing/free-tier'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function GET(request: NextRequest) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token, locale)
  if (error || !user) return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: t('insights.profileNotFound') }, { status: 404 })

  const access = await hasBillingAccess({ familyId: profile.family_id })
  const hasFullInsightAccess = access.isPaidTier || access.hasActiveTrial

  let query = supabaseAdmin
    .from('insights')
    .select('id, type, prompt_question, content, created_at, sent_channels')
    .eq('family_id', profile.family_id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!hasFullInsightAccess) {
    query = query.limit(5) // free tier: last 5 insights (2 proactive + 3 on-demand)
  } else {
    query = query.limit(100)
  }

	  const [{ data: insights }, counters] = await Promise.all([
	    query,
	    getUsageCounters(profile.family_id),
	  ])
  const onDemandLimit = hasFullInsightAccess
    ? FREE_TIER_LIMITS.onDemandInsightsPaidPerMonth
    : FREE_TIER_LIMITS.onDemandInsightsFreePerMonth

  return NextResponse.json({
    insights: insights ?? [],
    isPaidTier: access.isPaidTier,
    hasActiveTrial: access.hasActiveTrial,
    hasFullInsightAccess,
    onDemandUsed: counters.onDemandInsights,
    onDemandLimit,
  })
}
