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

  return { ok: true as const, profile }
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const [{ data: families, error: familiesError }, { data: users, error: usersError }] = await Promise.all([
    supabaseService
      .from('families')
      .select('id,name,trial_expires_at,lifetime_access,founders_enabled')
      .order('created_at', { ascending: true }),
    supabaseService
      .from('users')
      .select('id,family_id,name,email')
      .order('created_at', { ascending: true }),
  ])

  if (familiesError || usersError) {
    return NextResponse.json({ error: familiesError?.message || usersError?.message || 'Could not load families.' }, { status: 500 })
  }

  const rows = (families ?? []).map((family) => {
    const familyUsers = (users ?? []).filter((user) => user.family_id === family.id)

    return {
      ...family,
      members: familyUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    }
  })

  return NextResponse.json({ families: rows })
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as {
    family_id?: string
    lifetime_access?: boolean
    founders_enabled?: boolean
  } | null

  if (!body?.family_id) {
    return NextResponse.json({ error: 'Invalid family_id.' }, { status: 400 })
  }

  if (typeof body.lifetime_access !== 'boolean' && typeof body.founders_enabled !== 'boolean') {
    return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
  }

  const { data: familyUsers, error: usersError } = await supabaseService
    .from('users')
    .select('id,name,email')
    .eq('family_id', body.family_id)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const updatePayload: {
    lifetime_access?: boolean
    founders_enabled?: boolean
  } = {}

  if (typeof body.lifetime_access === 'boolean') {
    updatePayload.lifetime_access = body.lifetime_access
  }

  if (typeof body.founders_enabled === 'boolean') {
    updatePayload.founders_enabled = body.founders_enabled
  }

  const { error: updateError } = await supabaseService
    .from('families')
    .update(updatePayload)
    .eq('id', body.family_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: family, error: familyError } = await supabaseService
    .from('families')
    .select('id,name,trial_expires_at,lifetime_access,founders_enabled')
    .eq('id', body.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message || 'Could not reload family access.' }, { status: 500 })
  }

  return NextResponse.json({
    family: {
      ...family,
      members: (familyUsers ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    },
  })
}
