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
    .select('id,family_id,role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json({ role: 'member', otherMembers: [] })
  }

  const { data: otherMembers, error: membersError } = await supabaseAdmin
    .from('users')
    .select('id,name,email')
    .eq('family_id', profile.family_id)
    .neq('id', authData.user.id)
    .order('name')

  if (membersError) {
    return NextResponse.json({ error: 'Erro ao carregar membros.' }, { status: 500 })
  }

  return NextResponse.json({ role: 'admin', otherMembers: otherMembers ?? [] })
}
