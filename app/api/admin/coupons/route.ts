import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseService } from '@/lib/billing/supabase-service'

async function requireSuperAdmin(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile?.super_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const { data, error } = await supabaseService
    .from('coupon_codes')
    .select('id,code,stripe_coupon_id,is_active,created_at,updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ coupons: data })
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as { code?: string; stripe_coupon_id?: string } | null
  const code = body?.code?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('coupon_codes')
    .insert({ code, stripe_coupon_id: body?.stripe_coupon_id || null })
    .select('id,code,stripe_coupon_id,is_active,created_at,updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create coupon.' }, { status: 500 })
  }

  return NextResponse.json({ coupon: data })
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as
    | { code?: string; is_active?: boolean; stripe_coupon_id?: string | null }
    | null

  const code = body?.code?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Code is required.' }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {}
  if (typeof body?.is_active === 'boolean') updatePayload.is_active = body.is_active
  if (body && 'stripe_coupon_id' in body) updatePayload.stripe_coupon_id = body.stripe_coupon_id || null

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
  }

  const { data, error } = await supabaseService
    .from('coupon_codes')
    .update(updatePayload)
    .eq('code', code)
    .select('id,code,stripe_coupon_id,is_active,created_at,updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Coupon not found.' }, { status: 500 })
  }

  return NextResponse.json({ coupon: data })
}
