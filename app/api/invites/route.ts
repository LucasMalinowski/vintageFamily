import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendInviteEmail } from '@/lib/mailer'

const INVITE_EXPIRY_DAYS = 7

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

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id,name')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
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
      invited_by: authData.user.id,
      token,
      expires_at: expiresAt,
    })

  if (inviteError) {
    return NextResponse.json({ error: 'Erro ao criar convite.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' // TODO: replace with production URL
  const inviteLink = `${appUrl}/invite?token=${token}`

  try {
    await sendInviteEmail({ to: email, inviteLink, familyName: family.name })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao enviar email.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
