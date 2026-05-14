import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'

const OTP_COOLDOWN_MS = 60_000
const OTP_HOURLY_LIMIT = 5

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return '+' + digits
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000))
}

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
  const rawPhone: string = body.phone ?? ''

  if (!rawPhone) {
    return NextResponse.json({ error: 'Número de telefone obrigatório.' }, { status: 400 })
  }

  const normalized = normalizePhone(rawPhone)
  if (!/^\+\d{10,15}$/.test(normalized)) {
    return NextResponse.json({ error: 'Número de telefone inválido.' }, { status: 400 })
  }

  // Check if this phone belongs to another user
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone_number', normalized)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Este número já está cadastrado em outra conta.' }, { status: 409 })
  }

  // Rate limiting: enforce cooldown and hourly cap
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('phone_otp_sent_at,phone_otp_hour_count,phone_otp_hour_start')
    .eq('id', user.id)
    .maybeSingle()

  if (userRow?.phone_otp_sent_at) {
    const elapsed = Date.now() - new Date(userRow.phone_otp_sent_at).getTime()
    if (elapsed < OTP_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: `Aguarde ${wait}s antes de solicitar um novo código.` },
        { status: 429 }
      )
    }
  }

  // Rolling hourly cap
  const hourStart = userRow?.phone_otp_hour_start ? new Date(userRow.phone_otp_hour_start) : null
  const hourCount = userRow?.phone_otp_hour_count ?? 0
  const hourExpired = !hourStart || Date.now() - hourStart.getTime() > 3_600_000

  if (!hourExpired && hourCount >= OTP_HOURLY_LIMIT) {
    return NextResponse.json(
      { error: 'Limite de envios atingido. Tente novamente em 1 hora.' },
      { status: 429 }
    )
  }

  const code = generateOtp()
  const hashed = hashOtp(code)
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({
      phone_number_pending: normalized,
      phone_verification_code: hashed,
      phone_verification_expires_at: expiresAt,
      phone_verification_attempts: 0,
      phone_otp_sent_at: now,
      phone_otp_hour_count: hourExpired ? 1 : hourCount + 1,
      phone_otp_hour_start: hourExpired ? now : (userRow?.phone_otp_hour_start ?? now),
    })
    .eq('id', user.id)

  await whatsAppService.sendAuthOtp(normalized, code)
  whatsAppService.sendPrivacyNotice(normalized).catch(() => {})

  return NextResponse.json({ success: true })
}
