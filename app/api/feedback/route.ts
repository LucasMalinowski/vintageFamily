import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const VALID_TYPES = ['bug', 'feedback', 'suggestion'] as const

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { description, type, location, name, email, phone } = body

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'Descrição obrigatória' }, { status: 400 })
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: 'Descrição muito longa (máx. 2000 caracteres)' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('feedback').insert({
    family_id: null,
    name: typeof name === 'string' ? name.trim() || null : null,
    email: typeof email === 'string' ? email.trim() || null : null,
    phone: typeof phone === 'string' ? phone.trim() || null : null,
    type: type as string,
    location: typeof location === 'string' ? location.trim() || null : null,
    description: (description as string).trim(),
  })

  if (error) {
    console.error('[feedback] insert error:', error.message)
    return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
