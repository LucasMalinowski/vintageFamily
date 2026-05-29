import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseService } from '@/lib/billing/supabase-service'

async function requireSuperAdmin(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }

  const { data: profile } = await supabaseService
    .from('users')
    .select('id,super_admin')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!profile?.super_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
  }

  return { ok: true as const, userId: auth.user.id }
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as { family_id?: string } | null

  if (!body?.family_id) {
    return NextResponse.json({ error: 'Família inválida.' }, { status: 400 })
  }

  const { data: family } = await supabaseService
    .from('families')
    .select('id')
    .eq('id', body.family_id)
    .maybeSingle()

  if (!family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 })
  }

  const { error } = await supabaseService
    .from('users')
    .update({ family_id: body.family_id })
    .eq('id', admin.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
