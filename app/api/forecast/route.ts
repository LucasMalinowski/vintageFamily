import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { computeNextMonthForecast } from '@/lib/forecast/engine'
import { detectSpendingAnomalies } from '@/lib/forecast/anomaly'
import { generateForecastNarrative } from '@/lib/forecast/narrator'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function GET(request: NextRequest) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token, locale)
  if (error || !user) return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: t('forecast.profileNotFound') }, { status: 404 })

  const month = request.nextUrl.searchParams.get('month') ?? undefined

  const [forecast, anomalies] = await Promise.all([
    computeNextMonthForecast(profile.family_id, month),
    detectSpendingAnomalies(profile.family_id, 12, locale),
  ])

  const narrative = await generateForecastNarrative(forecast, anomalies, locale)

  return NextResponse.json({ forecast, anomalies, narrative })
}
