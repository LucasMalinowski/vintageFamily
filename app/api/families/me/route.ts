import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('family_id')
    .eq('id', authData.user.id)
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
