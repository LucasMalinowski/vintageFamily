import { supabase } from '@/lib/supabase'

let billingMeCache:
  | {
      token: string
      expiresAt: number
      promise: Promise<any>
    }
  | null = null

export async function getAuthBearerToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    return null
  }

  return data.session.access_token
}

export async function getBillingMe(options: { ttlMs?: number; force?: boolean } = {}) {
  const token = await getAuthBearerToken()
  if (!token) return null

  const ttlMs = options.ttlMs ?? 30_000
  const now = Date.now()

  if (
    !options.force &&
    billingMeCache &&
    billingMeCache.token === token &&
    billingMeCache.expiresAt > now
  ) {
    return billingMeCache.promise
  }

  const promise = fetch('/api/billing/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(async (response) => ({
    ok: response.ok,
    status: response.status,
    payload: await response.json().catch(() => null),
  }))

  billingMeCache = {
    token,
    expiresAt: now + ttlMs,
    promise,
  }

  return promise
}
