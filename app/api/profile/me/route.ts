import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getAuthMetadataName(user: {
  email?: string
  user_metadata?: Record<string, unknown>
  identities?: Array<{ identity_data?: Record<string, unknown> | null }>
}) {
  const identityData = user.identities?.[0]?.identity_data ?? {}
  return cleanString(user.user_metadata?.name) ||
    cleanString(user.user_metadata?.full_name) ||
    cleanString(user.user_metadata?.display_name) ||
    cleanString(identityData.name) ||
    cleanString(identityData.full_name) ||
    cleanString(identityData.display_name) ||
    cleanString(user.email?.split('@')[0])
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const auth = await requireUserByAccessToken(token)

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('name,email,avatar_url,phone_number,phone_number_pending,billing_cycle_day')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({
    ...data,
    name: cleanString(data.name) || getAuthMetadataName(auth.user),
    email: auth.user.email ?? data.email ?? '',
  })
}
