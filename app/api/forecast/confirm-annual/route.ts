import { NextRequest, NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken, getProfileByUserId } from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  const token = getAccessTokenFromAuthHeader(request)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const body = await request.json()
  const { category_name, category_id, typical_month, typical_amount_cents, description } = body

  if (!category_name || !typical_month || !typical_amount_cents) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const { error: insertError } = await supabaseAdmin.from('annual_events').insert({
    family_id: profile.family_id,
    description: description ?? category_name,
    category_id: category_id ?? null,
    category_name,
    typical_month,
    typical_amount_cents,
  })

  if (insertError) return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
