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

  const { memberId } = await request.json()
  if (!memberId) {
    return NextResponse.json({ error: 'Membro obrigatório.' }, { status: 400 })
  }

  if (memberId === authData.user.id) {
    return NextResponse.json({ error: 'Não é possível remover o próprio usuário.' }, { status: 400 })
  }

  const { error: profileDeleteError } = await supabaseAdmin.rpc('remove_family_member_profile', {
    p_actor_id: authData.user.id,
    p_member_id: memberId,
  })

  if (profileDeleteError) {
    if (profileDeleteError.message.includes('not_authorized')) {
      return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })
    }
    if (profileDeleteError.message.includes('member_not_found')) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
    }
    if (profileDeleteError.message.includes('cannot_remove_last_admin')) {
      return NextResponse.json({ error: 'Não é possível remover o último administrador.' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Erro ao remover perfil.' }, { status: 500 })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Perfil removido, mas houve erro ao remover o usuário de autenticação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
