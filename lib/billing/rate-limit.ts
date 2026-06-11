import { supabaseService } from './supabase-service'
import { sha256Hex } from '@/lib/security/tokens'

/**
 * Increments the request counter for the given user+endpoint within the current
 * time window and returns whether the request is within the allowed limit.
 *
 * Uses a Supabase RPC backed by rate_limit_counters table.
 * For higher throughput production use, replace with Redis/Upstash sliding window.
 *
 * @param userId   Supabase auth user UUID
 * @param endpoint Endpoint identifier string (e.g. 'create-subscription')
 * @param maxCount Maximum requests allowed per window
 * @param windowSeconds Window duration in seconds (default: 60)
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxCount: number,
  windowSeconds = 60,
): Promise<boolean> {
  try {
    const { data, error } = await supabaseService.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_count: maxCount,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('rate-limit check failed', { userId, endpoint, error })
      return true // fail open: don't block legitimate requests on DB error
    }

    return Boolean(data)
  } catch {
    return true // fail open on unexpected errors
  }
}

/**
 * IP-keyed variant for unauthenticated endpoints (feedback, token exchange).
 * Stores only a sha256 of the IP. Backed by the check_ip_rate_limit RPC.
 */
export async function checkIpRateLimit(
  request: Request,
  endpoint: string,
  maxCount: number,
  windowSeconds = 60,
): Promise<boolean> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  try {
    const { data, error } = await supabaseService.rpc('check_ip_rate_limit', {
      p_key: sha256Hex(ip),
      p_endpoint: endpoint,
      p_max_count: maxCount,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('ip-rate-limit check failed', { endpoint, error })
      return true // fail open
    }

    return Boolean(data)
  } catch {
    return true // fail open
  }
}
