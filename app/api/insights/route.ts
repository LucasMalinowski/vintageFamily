import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAccessTokenFromCookieStore, getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUsageCounters } from '@/lib/billing/free-tier'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromCookieStore(cookieStore) ?? getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

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

  const { data: insights } = await query

  const counters = await getUsageCounters(profile.family_id)
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
