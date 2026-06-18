import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

type SyncSessionBody = {
  access_token?: string
  refresh_token?: string
}

export async function POST(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  // Login-CSRF guard: a cross-site page could POST attacker tokens (as
  // text/plain to skip the CORS preflight) and plant a session in the
  // victim's browser. Only accept same-origin requests.
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: t('auth.invalidOrigin') }, { status: 403 })
  }

  const response = NextResponse.json({ ok: true })
  const { access_token: accessToken, refresh_token: refreshToken } = (await request
    .json()
    .catch(() => ({}))) as SyncSessionBody

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: t('auth.sessionMissing') }, { status: 400 })
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies().getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) {
    return NextResponse.json({ error: t('auth.invalidSession') }, { status: 401 })
  }

  return response
}
