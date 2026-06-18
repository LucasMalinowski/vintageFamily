import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendWelcomeEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader } from '@/lib/billing/auth'
import { sha256Hex } from '@/lib/security/tokens'
import { getUserLocale } from '@/lib/i18n/getLocale'

function getAccessToken(request: Request) {
  return getAccessTokenFromAuthHeader(request)
}

export async function POST(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { token, name } = await request.json()
  if (!token || !name) {
    return NextResponse.json({ error: t('invites.incompleteData') }, { status: 400 })
  }
  // The invite must match the email of the authenticated account — never an
  // email supplied in the body, otherwise any account holding a leaked invite
  // link could join the family (and desync users.email from auth.users.email).
  const normalizedEmail = (authData.user.email ?? '').trim().toLowerCase()
  if (!normalizedEmail) {
    return NextResponse.json({ error: t('invites.accountWithoutVerifiedEmail') }, { status: 400 })
  }
  const tokenHash = sha256Hex(String(token))

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('id,family_id,email,accepted,expires_at,families(name)')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: t('invites.invalidInvite') }, { status: 404 })
  }

  if (invite.accepted) {
    return NextResponse.json({ error: t('invites.alreadyUsed') }, { status: 410 })
  }

  if (invite.email !== normalizedEmail) {
    return NextResponse.json({ error: t('invites.emailMismatch') }, { status: 400 })
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: t('invites.expiredInvite') }, { status: 410 })
  }

  // Atomically claim the family slot: only update if family_id is still null.
  // This prevents a race condition where two simultaneous accepts would both
  // pass the pre-check and overwrite each other's family assignment.
  const { data: claimed, error: profileError } = await supabaseAdmin
    .from('users')
    .update({ family_id: invite.family_id, name, email: normalizedEmail, role: 'member' })
    .eq('id', authData.user.id)
    .is('family_id', null)
    .select('id')

  if (profileError) {
    return NextResponse.json({ error: t('invites.createProfileFailed') }, { status: 500 })
  }

  if (!claimed?.length) {
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('family_id')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (existing?.family_id) {
      return NextResponse.json({ error: t('invites.userAlreadyInFamily') }, { status: 409 })
    }

    // Row doesn't exist yet (edge case: SSO user accepting before profile is created)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        family_id: invite.family_id,
        name,
        email: normalizedEmail,
        password_hash: null,
        role: 'member',
      })

    if (insertError) {
      return NextResponse.json({ error: t('invites.createProfileFailed') }, { status: 500 })
    }
  }

  const { error: acceptError } = await supabaseAdmin
    .from('invites')
    .update({ accepted: true })
    .eq('id', invite.id)

  if (acceptError) {
    return NextResponse.json({ error: t('invites.finalizeFailed') }, { status: 500 })
  }

  const familyName = (invite.families as { name: string } | null)?.name ?? ''
  void sendWelcomeEmail({ to: normalizedEmail, name, familyName, locale })
  return NextResponse.json({ familyId: invite.family_id })
}
