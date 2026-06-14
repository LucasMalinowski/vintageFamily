import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAccessTokenFromAuthHeader,
  getAccessTokenFromCookieStore,
  requireUserByAccessToken,
  getProfileByUserId,
} from '@/lib/billing/auth'
import { notifyWidgetSync } from '@/lib/notifications/widgetSync'

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
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error: authError, user } = await requireUserByAccessToken(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const profile = await getProfileByUserId(user.id)
  if (!profile?.family_id) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  await notifyWidgetSync(profile.family_id)
  return NextResponse.json({ ok: true })
}
