import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { isPlanCode } from '@/lib/billing/constants'
import { supabaseService } from '@/lib/billing/supabase-service'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

async function requireSuperAdmin(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile?.super_admin) {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return { ok: false as const, response: NextResponse.json({ error: t('admin.accessDenied') }, { status: 403 }) }
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
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: t('admin.plansLoadFailed') }, { status: 500 })
  }

  return NextResponse.json({ plans: data })
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const body = (await request.json().catch(() => null)) as
    | {
        plan_code?: string
        is_visible?: boolean
        is_active?: boolean
      }
    | null

  if (!body?.plan_code || !isPlanCode(body.plan_code)) {
    return NextResponse.json({ error: t('admin.invalidPlan') }, { status: 400 })
  }

  if (typeof body.is_visible !== 'boolean' && typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: t('admin.noChangesProvided') }, { status: 400 })
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
    return NextResponse.json({ error: t('admin.planNotFound') }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
}
