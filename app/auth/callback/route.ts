/**
 * /auth/callback — OAuth redirect handler for Google / Apple SSO.
 *
 * Supabase redirects here after the provider authorises the user.
 * We exchange the code for a session, sync it to cookies (via sync-session),
 * and then redirect the user:
 *   - New user (no family_id)  → /signup/sso-complete
 *   - Existing user            → /inicio
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/inicio'
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Provider returned an error (e.g. user denied access).
  if (errorParam) {
    const params = new URLSearchParams({ error: errorParam })
    if (errorDescription) params.set('error_description', errorDescription)
    return NextResponse.redirect(`${origin}/login?${params}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  // Check whether this is a brand-new user (hasn't created a family yet).
  const { data: userData } = await supabase
    .from('users')
    .select('family_id')
    .eq('id', data.session.user.id)
    .maybeSingle()

  const isNew = !userData?.family_id

  if (isNew) {
    // Preserve the session cookies on the redirect response.
    const onboardingResponse = NextResponse.redirect(`${origin}/signup/sso-complete`)
    response.cookies.getAll().forEach((cookie) => {
      onboardingResponse.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'lax' | 'strict' | 'none' | undefined,
        path: cookie.path,
      })
    })
    return onboardingResponse
  }

  return response
}
