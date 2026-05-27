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
  title: string
  body: string
  sound?: 'default' | null
  data?: Record<string, unknown>
  badge?: number
  /** Android only — must match the channel created by expo-notifications plugin.
   *  The 'default' channel uses the custom notification icon + brand colour from app.json. */
  channelId?: string
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
        sent += chunk.length
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
