import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendAccountDeletionEmail } from '@/lib/mailer'

function getAccessToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [, token] = header.split(' ')
  return token || null
}

export async function GET(request: Request) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id,family_id,name,email,role,created_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  return NextResponse.json({
    account: {
      id: authData.user.id,
      email: authData.user.email,
      createdAt: authData.user.created_at,
    },
    profile,
    note: 'Dados financeiros (transações, metas, lembretes) são armazenados vinculados à sua família. Para exportar todos os dados, entre em contato: privacidade@florim.app',
  })
}

export async function DELETE(request: Request) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const userId = authData.user.id

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id,family_id,role,name,email')
    .eq('id', userId)
    .maybeSingle()

  const { error: deletionError } = await supabaseAdmin.rpc('delete_user_profile_for_account_deletion', {
    p_user_id: userId,
    p_new_admin_id: null,
  })

  if (deletionError) {
    if (deletionError.message.includes('new_admin_required')) {
      return NextResponse.json(
        { error: 'Você é administrador de uma família com outros membros. Use o fluxo de exclusão de conta no aplicativo para transferir a administração antes de excluir sua conta.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Erro ao preparar exclusão da conta.' }, { status: 500 })
  }

  const userEmail = authData.user.email ?? profile?.email
  if (userEmail) {
    void sendAccountDeletionEmail({ to: userEmail, name: profile?.name ?? '' })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Perfil removido, mas houve erro ao remover o usuário de autenticação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Todos os seus dados foram excluídos conforme a LGPD.' })
}
