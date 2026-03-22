import { NextRequest } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined
  getAll: () => Array<{ name: string; value: string }>
}

export function getAccessTokenFromAuthHeader(request: Request | NextRequest) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7)
}

function parseMaybeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function getAccessTokenFromCookieStore(cookieStore: CookieStoreLike) {
  const appCookie = cookieStore.get('app_access_token')?.value
  if (appCookie) {
    return decodeURIComponent(appCookie)
  }

  const tokenCookie = cookieStore
    .getAll()
    .find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'))

  if (!tokenCookie?.value) return null

  const decoded = decodeURIComponent(tokenCookie.value)
  const parsed = parseMaybeJson(decoded)

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
