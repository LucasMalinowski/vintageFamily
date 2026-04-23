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

  if (profile?.role === 'admin') {
    const { data: otherMembers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('family_id', profile.family_id)
      .neq('id', userId)

    if (otherMembers && otherMembers.length > 0) {
      return NextResponse.json(
        { error: 'Você é administrador de uma família com outros membros. Use o fluxo de exclusão de conta no aplicativo para transferir a administração antes de excluir sua conta.' },
        { status: 409 }
      )
    }

    await supabaseAdmin
      .from('families')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', profile.family_id)
  }

  const userEmail = authData.user.email ?? profile?.email
  if (userEmail) {
    void sendAccountDeletionEmail({ to: userEmail, name: profile?.name ?? '' })
  }

  await supabaseAdmin.auth.admin.deleteUser(userId)
  await supabaseAdmin.from('users').delete().eq('id', userId)

  return NextResponse.json({ ok: true, message: 'Todos os seus dados foram excluídos conforme a LGPD.' })
}
