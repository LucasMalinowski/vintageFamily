import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkIpRateLimit } from '@/lib/billing/rate-limit'

export async function POST(request: Request) {
  const allowed = await checkIpRateLimit(request, 'android-early-access', 3, 3600)
  if (!allowed) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }
  if (email.length > 254) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('android_early_access')
    .insert({ email })

  if (error) {
    // unique violation — already registered
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, already: true })
    }
    console.error('[android-early-access] insert error:', error.message)
    return NextResponse.json({ error: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
