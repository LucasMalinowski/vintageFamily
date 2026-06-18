import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function GET(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken, locale)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile?.family_id) {
    return NextResponse.json({ error: t('families.profileNotFound') }, { status: 404 })
  }

  const { data: family, error: familyError } = await supabaseAdmin
    .from('families')
    .select('id,name,trial_expires_at')
    .eq('id', profile.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: t('families.familyNotFound') }, { status: 404 })
  }

  return NextResponse.json({
    familyId: family.id,
    familyName: family.name ?? null,
    trialExpiresAt: family.trial_expires_at ?? null,
  })
}
