import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendAccountDeletionEmail } from '@/lib/mailer'

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

  const userId = authData.user.id
  const { newAdminId } = await request.json().catch(() => ({}))

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id,family_id,role,name,email')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  if (profile.role === 'admin') {
    const { data: otherMembers, error: membersError } = await supabaseAdmin
      .from('users')
      .select('id,family_id')
      .eq('family_id', profile.family_id)
      .neq('id', userId)

    if (membersError) {
      return NextResponse.json({ error: 'Erro ao verificar membros.' }, { status: 500 })
    }

    if (otherMembers && otherMembers.length > 0) {
      if (!newAdminId) {
        return NextResponse.json({ error: 'Escolha quem assumirá a administração.' }, { status: 400 })
      }

      const newAdmin = otherMembers.find((m) => m.id === newAdminId)
      if (!newAdmin) {
        return NextResponse.json({ error: 'Novo administrador inválido.' }, { status: 400 })
      }

      const { error: promoteError } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('id', newAdminId)

      if (promoteError) {
        return NextResponse.json({ error: 'Erro ao promover novo administrador.' }, { status: 500 })
      }
    } else {
      const { error: softDeleteError } = await supabaseAdmin
        .from('families')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', profile.family_id)

      if (softDeleteError) {
        return NextResponse.json({ error: 'Erro ao desativar família.' }, { status: 500 })
      }
    }
  }

  if (profile.email) {
    void sendAccountDeletionEmail({ to: profile.email, name: profile.name ?? '' })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }

  await supabaseAdmin.from('users').delete().eq('id', userId)

  return NextResponse.json({ ok: true })
}
