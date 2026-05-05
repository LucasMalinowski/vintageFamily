import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendInviteEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'

const INVITE_EXPIRY_DAYS = 7

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const email = body?.email
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id,name,role')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem enviar convites.' }, { status: 403 })
  }

  const { data: family, error: familyError } = await supabaseAdmin
    .from('families')
    .select('name')
    .eq('id', profile.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 400 })
  }

  const { data: existingInvite } = await supabaseAdmin
    .from('invites')
    .select('id')
    .eq('family_id', profile.family_id)
    .eq('email', email)
    .eq('accepted', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return NextResponse.json({ error: 'Já existe um convite pendente para este email.' }, { status: 409 })
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await supabaseAdmin
    .from('invites')
    .insert({
      family_id: profile.family_id,
      email,
      invited_by: auth.user.id,
      token,
      expires_at: expiresAt,
    })

  if (inviteError) {
    return NextResponse.json({ error: 'Erro ao criar convite.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 })
  }
  const inviteLink = `${appUrl}/invite?token=${token}`

  try {
    await sendInviteEmail({ to: email, inviteLink, familyName: family.name })
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar email de convite.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
