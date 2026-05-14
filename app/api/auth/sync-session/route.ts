import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

type SyncSessionBody = {
  access_token?: string
  refresh_token?: string
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true })
  const { access_token: accessToken, refresh_token: refreshToken } = (await request
    .json()
    .catch(() => ({}))) as SyncSessionBody

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Sessão ausente.' }, { status: 400 })
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
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
  }

  return response
}
