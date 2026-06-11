import { timingSafeEqual } from 'crypto'

/**
 * Validates the cron secret on scheduled endpoints.
 *
 * Accepts either `Authorization: Bearer <secret>` (Vercel Cron) or
 * `x-cron-secret: <secret>`. Fails closed when CRON_SECRET is unset —
 * otherwise the literal header "Bearer undefined" would authenticate.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET not configured - rejecting all requests')
    return false
  }

  const provided =
    request.headers.get('x-cron-secret') ??
    (request.headers.get('authorization')?.toLowerCase().startsWith('bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null)

  if (!provided) return false

  const providedBuf = Buffer.from(provided)
  const secretBuf = Buffer.from(secret)
  return providedBuf.length === secretBuf.length && timingSafeEqual(providedBuf, secretBuf)
}
