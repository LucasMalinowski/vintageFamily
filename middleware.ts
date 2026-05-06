import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { sendPostHogOtlpLog } from '@/lib/posthog-otlp'

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  event.waitUntil(
    sendPostHogOtlpLog('info', 'HTTP request received', {
      method: request.method,
      path: pathname,
      route_type: pathname.startsWith('/api/') ? 'api' : 'page',
      user_agent: request.headers.get('user-agent') ?? 'unknown',
      referer: request.headers.get('referer') ?? 'none',
      is_prefetch:
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.get('next-router-prefetch') === '1',
    }).catch((error) => {
      console.error('[posthog-logs] middleware request log failed:', error)
    })
  )

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
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|txt|xml)).*)',
  ],
}
