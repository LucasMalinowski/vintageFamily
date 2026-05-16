import { supabaseService } from './supabase-service'

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
