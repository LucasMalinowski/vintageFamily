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

  const { memberId } = await request.json()
  if (!memberId) {
    return NextResponse.json({ error: 'Member obrigatório.' }, { status: 400 })
  }

  if (memberId === authData.user.id) {
    return NextResponse.json({ error: 'Não é possível remover o próprio usuário.' }, { status: 400 })
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

  const { data: member, error: memberError } = await supabaseAdmin
    .from('users')
    .select('id,family_id')
    .eq('id', memberId)
    .maybeSingle()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
  }

  if (member.family_id !== requester.family_id) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Erro ao remover usuário.' }, { status: 500 })
  }

  const { error: profileDeleteError } = await supabaseAdmin.from('users').delete().eq('id', memberId)
  if (profileDeleteError) {
    return NextResponse.json({ error: 'Erro ao remover perfil.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
