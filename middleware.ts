import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { sendPostHogOtlpLog } from '@/lib/posthog-otlp'

function sanitizeUrlForLog(value: string | null) {
  if (!value) return 'none'

  try {
    const url = new URL(value)
    let redacted = false
    for (const key of ['token', 'handoff', 'code', 'access_token', 'refresh_token', 'token_hash']) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        redacted = true
      }
    }
    return `${url.origin}${url.pathname}${redacted ? '?redacted=1' : ''}`
  } catch {
    return 'invalid'
  }
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const requestLabel = `PAGE ${request.method} ${pathname}`
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('next-router-prefetch') === '1'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session so access tokens are always fresh before server components render
  const { data: authData } = await supabase.auth.getUser()

  // Prefetches are noise: skip the log (and its extra profile DB query)
  if (!isPrefetch) {
    event.waitUntil(
      (async () => {
        const attributes: Record<string, string | number | boolean> = {
          method: request.method,
          path: pathname,
          route_type: 'page',
          request_label: requestLabel,
          user_agent: request.headers.get('user-agent') ?? 'unknown',
          referer: sanitizeUrlForLog(request.headers.get('referer')),
          is_prefetch: false,
        }

        if (authData.user?.id) {
          const { data: profile } = await supabase
            .from('users')
            .select('id,family_id,role')
            .eq('id', authData.user.id)
            .maybeSingle()

          attributes.auth_user_id = authData.user.id

          if (profile?.id) attributes.user_id = profile.id
          if (profile?.family_id) attributes.family_id = profile.family_id
          if (profile?.role) attributes.user_role = profile.role
        }

        await sendPostHogOtlpLog('info', requestLabel, attributes, 'florim-middleware')
      })().catch((error) => {
        console.error('[posthog-logs] middleware request log failed:', error)
      })
    )
  }

  // Detect locale from Accept-Language header for first-time visitors
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  const VALID_LOCALES = ['pt-BR', 'en', 'es']
  if (!localeCookie || !VALID_LOCALES.includes(localeCookie)) {
    const acceptLang = request.headers.get('accept-language') ?? ''
    let detectedLocale = 'pt-BR'
    if (/\ben\b/i.test(acceptLang) && !/pt/i.test(acceptLang.split(',')[0])) {
      detectedLocale = 'en'
    } else if (/\bes\b/i.test(acceptLang) && !/pt/i.test(acceptLang.split(',')[0])) {
      detectedLocale = 'es'
    }
    supabaseResponse.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return supabaseResponse
}

// /api routes are excluded: they authenticate via bearer token themselves, so
// the session-refresh network call and request logging here would only add
// latency and double the Supabase auth load on every API request.
export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|txt|xml)).*)',
  ],
}
