import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import {
  getAccessTokenFromAuthHeader,
  getAccessTokenFromCookieStore,
  requireUserByAccessToken,
  getProfileByUserId,
} from '@/lib/billing/auth'
import { notifyWidgetSync } from '@/lib/notifications/widgetSync'
import { getUserLocale } from '@/lib/i18n/getLocale'

/**
 * POST /api/widgets/sync
 *
 * Called fire-and-forget after any mutation that affects the mobile app's
 * home screen widgets (expenses, incomes, reminders, savings, limits).
 * Sends a silent push to every device in the family so widgets refresh
 * without the phone app being opened.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error: authError, user } = await requireUserByAccessToken(token, locale)
  if (authError || !user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.family_id) {
    return NextResponse.json({ error: t('widgets.profileNotFound') }, { status: 404 })
  }

  await notifyWidgetSync(profile.family_id)
  return NextResponse.json({ ok: true })
}
