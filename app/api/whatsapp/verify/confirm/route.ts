import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'

const MAX_ATTEMPTS = 5

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const code: string = body.code ?? ''

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('phone_number_pending,phone_verification_code,phone_verification_expires_at,phone_verification_attempts')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRow?.phone_verification_code || !userRow.phone_verification_expires_at) {
    return NextResponse.json({ error: 'Nenhum código pendente.' }, { status: 400 })
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
      { error: 'Muitas tentativas. Solicite um novo código.' },
      { status: 429 }
    )
  }

  const expired = new Date(userRow.phone_verification_expires_at) < new Date()
  if (expired) {
    return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 })
  }

  const hashed = hashOtp(code)
  if (hashed !== userRow.phone_verification_code) {
    await supabaseAdmin
      .from('users')
      .update({ phone_verification_attempts: attempts + 1 })
      .eq('id', user.id)
    return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 })
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
