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
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { inviteId } = await request.json()
  if (!inviteId) {
    return NextResponse.json({ error: 'Convite obrigatório.' }, { status: 400 })
  }

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from('users')
    .select('id,family_id,role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (requesterError || !requester) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('id,family_id,accepted')
    .eq('id', inviteId)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })
  }

  if (invite.family_id !== requester.family_id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: 'Convite já aceito.' }, { status: 409 })
  }

  const { error: deleteError } = await supabaseAdmin.from('invites').delete().eq('id', inviteId)
  if (deleteError) {
    return NextResponse.json({ error: 'Erro ao cancelar convite.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
