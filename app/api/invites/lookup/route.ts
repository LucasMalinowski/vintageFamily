import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sha256Hex } from '@/lib/security/tokens'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 })
  }
  const tokenHash = sha256Hex(token)

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('email,family_id,accepted,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: 'Convite já utilizado.' }, { status: 410 })
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 410 })
  }

  const { data: family } = await supabaseAdmin
    .from('families')
    .select('name')
    .eq('id', invite.family_id)
    .maybeSingle()

  return NextResponse.json({
    email: invite.email,
    familyName: family?.name ?? 'Família',
  })
}
