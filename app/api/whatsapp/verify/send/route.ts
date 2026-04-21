import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'

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
  const token = getAccessTokenFromCookieStore(cookieStore)
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

  const code = generateOtp()
  const hashed = hashOtp(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({
      phone_number_pending: normalized,
      phone_verification_code: hashed,
      phone_verification_expires_at: expiresAt,
    })
    .eq('id', user.id)

  await whatsAppService.sendAuthOtp(normalized, code)

  return NextResponse.json({ success: true })
}
