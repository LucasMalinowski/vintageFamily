import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementExportImport, getUsageCounters } from '@/lib/billing/free-tier'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'

// GET - check remaining without consuming
export async function GET(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile?.family_id) {
      return NextResponse.json({ error: t('billing.familyNotFound') }, { status: 403 })
    }

    const access = await hasBillingAccess({ familyId: profile.family_id })

    if (!access.isFreeTier) {
      return NextResponse.json({ allowed: true, remaining: null })
    }

    const { exportImportCount } = await getUsageCounters(profile.family_id)
    const remaining = Math.max(0, FREE_TIER_LIMITS.exportImportPerMonth - exportImportCount)

    return NextResponse.json({ allowed: remaining > 0, remaining })
  } catch {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: t('billing.genericUnexpectedError') }, { status: 500 })
  }
}

// POST - check and consume one unit
export async function POST(request: Request) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile?.family_id) {
      return NextResponse.json({ error: t('billing.familyNotFound') }, { status: 403 })
    }

    const access = await hasBillingAccess({ familyId: profile.family_id })

    if (!access.isFreeTier) {
      return NextResponse.json({ allowed: true, remaining: null })
    }

    const result = await checkAndIncrementExportImport(profile.family_id)
    return NextResponse.json(result)
  } catch {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: t('billing.genericUnexpectedError') }, { status: 500 })
  }
}
