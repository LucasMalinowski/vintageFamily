import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getTranslations } from 'next-intl/server'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { getUserLocale } from '@/lib/i18n/getLocale'

const MAX_ATTEMPTS = 5

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error, user } = await requireUserByAccessToken(token, locale)
  if (error || !user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code: string = body.code ?? ''

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: t('whatsapp.invalidCode') }, { status: 400 })
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('phone_number_pending,phone_verification_code,phone_verification_expires_at,phone_verification_attempts')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRow?.phone_verification_code || !userRow.phone_verification_expires_at) {
    return NextResponse.json({ error: t('whatsapp.noPendingCode') }, { status: 400 })
  }

  const attempts = userRow.phone_verification_attempts ?? 0
  if (attempts >= MAX_ATTEMPTS) {
    await supabaseAdmin
      .from('users')
      .update({
        phone_verification_code: null,
        phone_verification_expires_at: null,
        phone_verification_attempts: 0,
      })
      .eq('id', user.id)
    return NextResponse.json(
      { error: t('whatsapp.tooManyAttemptsRequestNew') },
      { status: 429 }
    )
  }

  const expired = new Date(userRow.phone_verification_expires_at) < new Date()
  if (expired) {
    return NextResponse.json({ error: t('whatsapp.codeExpiredRequestNew') }, { status: 400 })
  }

  const hashed = hashOtp(code)
  if (hashed !== userRow.phone_verification_code) {
    await supabaseAdmin
      .from('users')
      .update({ phone_verification_attempts: attempts + 1 })
      .eq('id', user.id)
    return NextResponse.json({ error: t('whatsapp.invalidOrExpiredCode') }, { status: 400 })
  }

  const verifiedPhone = userRow.phone_number_pending!

  await supabaseAdmin
    .from('users')
    .update({
      phone_number: verifiedPhone,
      phone_number_pending: null,
      phone_verification_code: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
    })
    .eq('id', user.id)

  try { await whatsAppService.sendWelcomeTips(verifiedPhone) } catch {}

  return NextResponse.json({ success: true })
}
