import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAccessTokenFromAuthHeader,
  getAccessTokenFromCookieStore,
  requireUserByAccessToken,
  getProfileByUserId,
} from '@/lib/billing/auth'
import { checkAndAlertCategoryLimit } from '@/lib/categories/limitAlert'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

/**
 * POST /api/categories/check-limit
 *
 * Called after an expense is saved (fire-and-forget from client).
 * Checks if the category's monthly limit threshold was just crossed and,
 * if so, sends push notifications + WhatsApp/email via dispatchInsights.
 */

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error: authError, user } = await requireUserByAccessToken(token)
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  if (authError || !user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.family_id) {
    return NextResponse.json({ error: t('account.profileNotFound') }, { status: 404 })
  }

  let body: { categoryId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // familyId always comes from the authenticated profile — never from the body
  const familyId = profile.family_id
  const { categoryId } = body
  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId required' }, { status: 400 })
  }

  const result = await checkAndAlertCategoryLimit(familyId, categoryId, locale)
  return NextResponse.json(result)
}
