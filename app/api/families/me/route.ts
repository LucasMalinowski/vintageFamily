import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile?.family_id) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  const { data: family, error: familyError } = await supabaseAdmin
    .from('families')
    .select('id,name,trial_expires_at')
    .eq('id', profile.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({
    familyId: family.id,
    familyName: family.name ?? null,
    trialExpiresAt: family.trial_expires_at ?? null,
  })
}
