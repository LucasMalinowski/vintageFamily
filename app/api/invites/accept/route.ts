import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendWelcomeEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader } from '@/lib/billing/auth'
import { sha256Hex } from '@/lib/security/tokens'

function getAccessToken(request: Request) {
  return getAccessTokenFromAuthHeader(request)
}

export async function POST(request: Request) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { token, name, email } = await request.json()
  if (!token || !name || !email) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  const tokenHash = sha256Hex(String(token))

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('id,family_id,email,accepted,expires_at,families(name)')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: 'Convite já utilizado.' }, { status: 410 })
  }

  if (invite.email !== normalizedEmail) {
    return NextResponse.json({ error: 'Email não corresponde ao convite.' }, { status: 400 })
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 410 })
  }

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('family_id')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (existingUser?.family_id) {
    return NextResponse.json({ error: 'Usuário já pertence a uma família.' }, { status: 409 })
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: authData.user.id,
      family_id: invite.family_id,
      name,
      email: normalizedEmail,
      password_hash: null,
      role: 'member',
    })

  if (profileError) {
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  const { error: acceptError } = await supabaseAdmin
    .from('invites')
    .update({ accepted: true })
    .eq('id', invite.id)

  if (acceptError) {
    return NextResponse.json({ error: 'Erro ao finalizar convite.' }, { status: 500 })
  }

  const familyName = (invite.families as { name: string } | null)?.name ?? ''
  void sendWelcomeEmail({ to: normalizedEmail, name, familyName })
  return NextResponse.json({ familyId: invite.family_id })
}
