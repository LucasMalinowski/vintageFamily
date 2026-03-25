import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    let foundersEligible = false

    const plansQuery = supabaseService
      .from('plan_settings')
      .select('plan_code,is_visible,is_active')
      .order('created_at', { ascending: true })

    if (!accessToken) {
      const plansResult = await plansQuery

      return NextResponse.json({
        founders_eligible: foundersEligible,
        plans: plansResult.data ?? [],
      })
    }

    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const [familyResult, plansResult] = await Promise.all([
      supabaseService
        .from('families')
        .select('founders_enabled')
        .eq('id', profile.family_id)
        .maybeSingle(),
      plansQuery,
    ])

    foundersEligible = Boolean(familyResult.data?.founders_enabled)

    return NextResponse.json({
      founders_eligible: foundersEligible,
      plans: plansResult.data ?? [],
    })
  } catch (error: any) {
    console.error('billing-eligibility failed', error)
    return NextResponse.json({ error: error?.message || 'Erro inesperado na cobrança.' }, { status: 500 })
  }
}
