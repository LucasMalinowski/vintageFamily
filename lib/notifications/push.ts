/**
 * Expo Push Notification sender.
 *
 * Delivery path: Expo Push API → FCM (Android) / APNs (iOS).
 * Goes through Google Play Services / Apple servers — bypasses all OEM
 * battery optimisation layers that kill local AlarmManager alarms.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
/** Expo API hard-limit per request */
const CHUNK_SIZE = 100

export interface ExpoPushMessage {
  to: string
  /** Omit title/body for a silent, data-only push (e.g. widget refresh). */
  title?: string
  body?: string
  sound?: 'default' | null
  data?: Record<string, unknown>
  badge?: number
  /** Android only — must match the channel created by expo-notifications plugin.
   *  The 'default' channel uses the custom notification icon + brand colour from app.json. */
  channelId?: string
  /** iOS — wakes the app in the background to process a silent push. */
  _contentAvailable?: boolean
  /** Android — 'high' delivers data-only messages promptly even while idle. */
  priority?: 'default' | 'normal' | 'high'
}

export interface PushResult {
  sent: number
  failed: number
}

export async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<PushResult> {
  let sent = 0
  let failed = 0

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      })

      if (res.ok) {
        const body = await res.json()
        const tickets: Array<{ status: string; message?: string; details?: unknown }> = body?.data ?? []
        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            sent++
          } else {
            failed++
            console.error('[push] Expo ticket error:', ticket.message, ticket.details)
          }
        }
      } else {
        failed += chunk.length
        console.error('[push] Expo API error:', res.status, await res.text())
      }
    } catch (err) {
      failed += chunk.length
      console.error('[push] fetch error:', err)
    }
  }

  return { sent, failed }
}
