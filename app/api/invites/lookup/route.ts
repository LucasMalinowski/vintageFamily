import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sha256Hex } from '@/lib/security/tokens'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function GET(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: t('invites.tokenRequired') }, { status: 400 })
  }
  const tokenHash = sha256Hex(token)

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .select('email,family_id,accepted,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (inviteError || !invite) {
    return NextResponse.json({ error: t('invites.invalidInvite') }, { status: 404 })
  }

  if (invite.accepted || new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: t('invites.invalidInvite') }, { status: 404 })
  }

  const { data: family } = await supabaseAdmin
    .from('families')
    .select('name')
    .eq('id', invite.family_id)
    .maybeSingle()

  return NextResponse.json({
    email: invite.email,
    familyName: family?.name ?? t('invites.defaultFamilyName'),
  })
}
