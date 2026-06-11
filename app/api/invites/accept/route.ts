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

  const { token, name } = await request.json()
  if (!token || !name) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }
  // The invite must match the email of the authenticated account — never an
  // email supplied in the body, otherwise any account holding a leaked invite
  // link could join the family (and desync users.email from auth.users.email).
  const normalizedEmail = (authData.user.email ?? '').trim().toLowerCase()
  if (!normalizedEmail) {
    return NextResponse.json({ error: 'Conta sem email verificado.' }, { status: 400 })
  }
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

  // Atomically claim the family slot: only update if family_id is still null.
  // This prevents a race condition where two simultaneous accepts would both
  // pass the pre-check and overwrite each other's family assignment.
  const { data: claimed, error: profileError } = await supabaseAdmin
    .from('users')
    .update({ family_id: invite.family_id, name, email: normalizedEmail, role: 'member' })
    .eq('id', authData.user.id)
    .is('family_id', null)
    .select('id')

  if (profileError) {
    return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
  }

  if (!claimed?.length) {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('family_id')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (existing?.family_id) {
      return NextResponse.json({ error: 'Usuário já pertence a uma família.' }, { status: 409 })
    }

    // Row doesn't exist yet (edge case: SSO user accepting before profile is created)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        family_id: invite.family_id,
        name,
        email: normalizedEmail,
        password_hash: null,
        role: 'member',
      })

    if (insertError) {
      return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
    }
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
