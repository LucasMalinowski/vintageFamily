import { NextResponse } from 'next/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'
import { checkRateLimit } from '@/lib/billing/rate-limit'

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const allowed = await checkRateLimit(auth.user.id, 'create-portal-session', 5)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento e tente novamente.' }, { status: 429 })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
    }

    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado.' }, { status: 404 })
    }

    if (!process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID) {
      return NextResponse.json({ error: 'Configuração do portal de cobrança ausente.' }, { status: 500 })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/settings/billing`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (error: any) {
    console.error('create-portal-session failed', error)
    return NextResponse.json({ error: billingErrorMessage(error, 'Erro inesperado na cobrança.') }, { status: 500 })
  }
}
