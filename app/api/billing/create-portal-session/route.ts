import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only family admins can manage billing.' }, { status: 403 })
    }

    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!customerRow?.stripe_customer_id) {
      return NextResponse.json({ error: 'Stripe customer not found.' }, { status: 404 })
    }

    if (!process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID) {
      return NextResponse.json({ error: 'Missing STRIPE_BILLING_PORTAL_CONFIGURATION_ID.' }, { status: 500 })
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerRow.stripe_customer_id,
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (error: any) {
    console.error('create-portal-session failed', error)
    return NextResponse.json({ error: error?.message || 'Unexpected billing error.' }, { status: 500 })
  }
}
