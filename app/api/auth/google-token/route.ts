/**
 * POST /api/auth/google-token
 *
 * Exchanges a Google auth code (from the client-side popup flow) for an
 * ID token that can be passed to supabase.auth.signInWithIdToken().
 *
 * This keeps florim.app as the visible domain — the Supabase URL never
 * appears on the Google consent screen.
 */
import { NextResponse } from 'next/server'
import { checkIpRateLimit } from '@/lib/billing/rate-limit'

export async function POST(request: Request) {
  try {
    // Unauthenticated proxy to Google's token endpoint — throttle by IP
    const allowed = await checkIpRateLimit(request, 'google-token', 10)
    if (!allowed) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento.' }, { status: 429 })
    }

    const { code } = (await request.json()) as { code?: string }
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

	    const res = await fetch('https://oauth2.googleapis.com/token', {
	      method: 'POST',
	      cache: 'no-store',
	      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
	      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: 'postmessage', // required for auth-code popup flow
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await res.json()

    if (!res.ok || !tokens.id_token) {
      return NextResponse.json(
        { error: tokens.error_description ?? 'Token exchange failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ idToken: tokens.id_token as string })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
