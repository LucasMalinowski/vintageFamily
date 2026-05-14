import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseService } from '@/lib/billing/supabase-service'
import { generateUrlToken, sha256Hex } from '@/lib/security/tokens'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Clean up any existing unused tokens for this user first
    await supabaseService
      .from('web_handoff_tokens')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('used', false)

    const handoffToken = generateUrlToken()
    const { error } = await supabaseService
      .from('web_handoff_tokens')
      .insert({
        user_id: auth.user.id,
        access_token: '',
        token_hash: sha256Hex(handoffToken),
      })

    if (error) {
      console.error('web-handoff insert failed', error)
      return NextResponse.json({ error: 'Erro ao gerar token.' }, { status: 500 })
    }

    return NextResponse.json({ token: handoffToken })
  } catch (error: any) {
    console.error('web-handoff failed', error)
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 })
  }
}
