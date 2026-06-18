import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendInviteEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'
import { generateUrlToken, sha256Hex } from '@/lib/security/tokens'
import { getUserLocale } from '@/lib/i18n/getLocale'

const INVITE_EXPIRY_DAYS = 7

export async function POST(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken, locale)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: t('invites.emailRequired') }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id,name,role')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: t('invites.profileNotFound') }, { status: 400 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ error: t('invites.onlyAdminsCanInvite') }, { status: 403 })
  }

  const { data: family, error: familyError } = await supabaseAdmin
    .from('families')
    .select('name')
    .eq('id', profile.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: t('invites.familyNotFound') }, { status: 400 })
  }

  await supabaseAdmin
    .from('invites')
    .delete()
    .eq('family_id', profile.family_id)
    .eq('email', email)
    .eq('accepted', false)
    .lte('expires_at', new Date().toISOString())

  const token = generateUrlToken()
  const tokenHash = sha256Hex(token)
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: inviteError } = await supabaseAdmin
    .from('invites')
    .insert({
      family_id: profile.family_id,
      email,
      invited_by: auth.user.id,
      token: tokenHash,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })

  if (inviteError) {
    if (inviteError.code === '23505') {
      return NextResponse.json({ error: t('invites.alreadyPending') }, { status: 409 })
    }
    return NextResponse.json({ error: t('invites.createFailed') }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: t('invites.serverConfigIncomplete') }, { status: 500 })
  }
  const inviteLink = `${appUrl}/invite?token=${token}`

  try {
    await sendInviteEmail({ to: email, inviteLink, familyName: family.name, locale })
  } catch {
    return NextResponse.json({ error: t('invites.sendEmailFailed') }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
