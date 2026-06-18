import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error, user } = await requireUserByAccessToken(token, locale)

  if (error || !user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      phone_number: null,
      phone_number_pending: null,
      phone_verification_code: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: t('whatsapp.removePhoneFailed') }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
