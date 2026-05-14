import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error, user } = await requireUserByAccessToken(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      phone_number: null,
      phone_number_pending: null,
      phone_verification_code: null,
      phone_verification_expires_at: null,
      phone_verification_attempts: 0,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao remover telefone.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
