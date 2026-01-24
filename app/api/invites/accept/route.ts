import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function getAccessToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [, token] = header.split(' ')
  return token || null
}

export async function POST(request: Request) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token, name, email } = await request.json()
  if (!token || !name || !email) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('id,family_id,email,accepted,expires_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: 'Convite já utilizado.' }, { status: 410 })
  }

  if (invite.email !== email) {
    return NextResponse.json({ error: 'Email não corresponde ao convite.' }, { status: 400 })
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Convite expirado.' }, { status: 410 })
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: authData.user.id,
      family_id: invite.family_id,
      name,
      email,
      password_hash: 'managed_by_supabase_auth',
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

  return NextResponse.json({ familyId: invite.family_id })
}
