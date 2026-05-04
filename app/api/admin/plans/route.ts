import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { isPlanCode } from '@/lib/billing/constants'
import { supabaseService } from '@/lib/billing/supabase-service'

async function requireSuperAdmin(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile?.super_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const { data, error } = await supabaseService
    .from('plan_settings')
    .select('id,plan_code,is_visible,is_active,created_at,updated_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Erro ao carregar planos.' }, { status: 500 })
  }

  return NextResponse.json({ plans: data })
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as
    | {
        plan_code?: string
        is_visible?: boolean
        is_active?: boolean
      }
    | null

  if (!body?.plan_code || !isPlanCode(body.plan_code)) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  }

  if (typeof body.is_visible !== 'boolean' && typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'Nenhuma alteração foi informada.' }, { status: 400 })
  }

  const updatePayload: Record<string, boolean> = {}
  if (typeof body.is_visible === 'boolean') updatePayload.is_visible = body.is_visible
  if (typeof body.is_active === 'boolean') updatePayload.is_active = body.is_active

  const { data, error } = await supabaseService
    .from('plan_settings')
    .update(updatePayload)
    .eq('plan_code', body.plan_code)
    .select('id,plan_code,is_visible,is_active,updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
}
