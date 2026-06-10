import { NextRequest, NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { computeNextMonthForecast } from '@/lib/forecast/engine'
import { detectSpendingAnomalies } from '@/lib/forecast/anomaly'
import { generateForecastNarrative } from '@/lib/forecast/narrator'

export async function GET(request: NextRequest) {
  const token = getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const month = request.nextUrl.searchParams.get('month') ?? undefined

  const [forecast, anomalies] = await Promise.all([
    computeNextMonthForecast(profile.family_id, month),
    detectSpendingAnomalies(profile.family_id),
  ])

  const narrative = await generateForecastNarrative(forecast, anomalies)

  return NextResponse.json({ forecast, anomalies, narrative })
}
