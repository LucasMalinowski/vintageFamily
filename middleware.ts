import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { sendPostHogOtlpLog } from '@/lib/posthog-otlp'

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const routeType = pathname.startsWith('/api/') ? 'api' : 'page'
  const requestLabel = `${routeType.toUpperCase()} ${request.method} ${pathname}`

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

  event.waitUntil(
    (async () => {
      const attributes: Record<string, string | number | boolean> = {
        method: request.method,
        path: pathname,
        route_type: routeType,
        request_label: requestLabel,
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        referer: request.headers.get('referer') ?? 'none',
        is_prefetch:
          request.headers.get('purpose') === 'prefetch' ||
          request.headers.get('next-router-prefetch') === '1',
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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|txt|xml)).*)',
  ],
}
