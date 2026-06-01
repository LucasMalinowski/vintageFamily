import { NextRequest } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined
  getAll: () => Array<{ name: string; value: string }>
}

export function getAccessTokenFromAuthHeader(request: Request | NextRequest) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7)
}

function parseMaybeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return null
  }
}

export function getAccessTokenFromCookieStore(cookieStore: CookieStoreLike) {
  const allCookies = cookieStore.getAll()
  const projectRef = getProjectRef()

  // Use the exact cookie key for this project to avoid collisions with other Supabase projects
  const cookieKey = projectRef ? `sb-${projectRef}-auth-token` : null

  const singleCookie = cookieKey
    ? allCookies.find((c) => c.name === cookieKey)
    : allCookies.find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  // @supabase/ssr splits tokens > 3180 bytes into chunks: key.0, key.1, ...
  const firstChunk = cookieKey
    ? allCookies.find((c) => c.name === `${cookieKey}.0`)
    : allCookies.find((c) => c.name.startsWith('sb-') && /.*-auth-token\.0$/.test(c.name))

  let rawValue: string | null = null

  if (singleCookie?.value) {
    rawValue = decodeURIComponent(singleCookie.value)
  } else if (firstChunk) {
    const baseKey = firstChunk.name.replace(/\.0$/, '')
    const parts: string[] = []
    for (let i = 0; ; i++) {
      const chunk = allCookies.find((c) => c.name === `${baseKey}.${i}`)
      if (!chunk) break
      parts.push(chunk.value)
    }
    rawValue = parts.join('')
  }

  if (!rawValue) return null

  const parsed = parseMaybeJson(rawValue)

  if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
    return parsed[0]
  }

  if (parsed && typeof parsed === 'object' && 'access_token' in parsed && typeof parsed.access_token === 'string') {
    return parsed.access_token
  }

  return null
}

export async function requireUserByAccessToken(accessToken: string | null) {
  if (!accessToken) {
    return { error: 'Não autorizado.', status: 401 as const, user: null }
  }

  const { data, error } = await supabaseService.auth.getUser(accessToken)

  if (error || !data.user) {
    return { error: 'Não autorizado.', status: 401 as const, user: null }
  }

  return { error: null, status: 200 as const, user: data.user }
}

export async function getProfileByUserId(userId: string) {
  const { data, error } = await supabaseService
    .from('users')
    .select('id,email,family_id,role,super_admin')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as {
    id: string
    email: string
    family_id: string
    role: string
    super_admin: boolean | null
  }
}
