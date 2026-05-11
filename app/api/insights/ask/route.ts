import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAccessTokenFromCookieStore, getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementOnDemandInsight } from '@/lib/billing/free-tier'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'
import { generateOnDemandInsight } from '@/lib/insights/generator'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromCookieStore(cookieStore) ?? getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const body = await request.json()
  const question: string = (body?.question ?? '').trim()

  if (!question || question.length < 5) {
    return NextResponse.json({ error: 'Pergunta muito curta.' }, { status: 400 })
  }

  const access = await hasBillingAccess({ familyId: profile.family_id })
  const hasFullInsightAccess = access.isPaidTier || access.hasActiveTrial

  const { allowed, remaining } = await checkAndIncrementOnDemandInsight(profile.family_id, hasFullInsightAccess)
  if (!allowed) {
    return NextResponse.json(
      { error: `Você atingiu o limite de ${FREE_TIER_LIMITS.onDemandInsightsFreePerMonth} insights sob demanda este mês. Assine o plano Pro para perguntas ilimitadas.` },
      { status: 429 }
    )
  }

  const content = await generateOnDemandInsight(profile.family_id, question)

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
