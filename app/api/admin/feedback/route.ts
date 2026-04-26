import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const PAGE_SIZE = 25

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile?.super_admin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || null
  const location = url.searchParams.get('location') || null
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'))

  let query = supabaseAdmin
    .from('feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (type) query = query.eq('type', type)
  if (location) query = query.eq('location', location)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ feedbacks: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}
