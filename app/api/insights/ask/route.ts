import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementOnDemandInsight } from '@/lib/billing/free-tier'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'
import { generateOnDemandInsight } from '@/lib/insights/generator'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function POST(request: NextRequest) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token, locale)
  if (error || !user) return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: t('insights.profileNotFound') }, { status: 404 })

  const body = await request.json()
  const question: string = (body?.question ?? '').trim()

  if (!question || question.length < 5) {
    return NextResponse.json({ error: t('insights.questionTooShort') }, { status: 400 })
  }
  // Cap input length to prevent prompt-injection via long crafted inputs
  if (question.length > 300) {
    return NextResponse.json({ error: t('insights.questionTooLong') }, { status: 400 })
  }

  const access = await hasBillingAccess({ familyId: profile.family_id })
  const hasFullInsightAccess = access.isPaidTier || access.hasActiveTrial

  const { allowed, remaining } = await checkAndIncrementOnDemandInsight(profile.family_id, hasFullInsightAccess)
  if (!allowed) {
    return NextResponse.json(
      { error: t('insights.onDemandLimitReached', { count: FREE_TIER_LIMITS.onDemandInsightsFreePerMonth }) },
      { status: 429 }
    )
  }

  const content = await generateOnDemandInsight(profile.family_id, question, locale)

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  await supabaseAdmin.from('insights').insert({
    family_id: profile.family_id,
    user_id: user.id,
    period,
    type: 'on_demand',
    prompt_question: question,
    content,
    sent_channels: [],
  })

  return NextResponse.json({ content, remaining })
}
