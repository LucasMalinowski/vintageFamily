import {supabaseAdmin} from '@/lib/supabaseAdmin'
import {sendExpoPushNotifications} from '@/lib/notifications/push'

/**
 * Sends a silent, data-only push to every device of every member of a
 * family, telling the Florim app to refresh its home screen widgets.
 *
 * Call this after any mutation that affects widget data: expenses,
 * incomes, reminders, savings/dreams, category limits. Fire-and-forget —
 * never let this fail the caller's request.
 */
export async function notifyWidgetSync(familyId: string): Promise<void> {
  try {
    const {data: users} = await supabaseAdmin.from('users').select('id').eq('family_id', familyId)
    const userIds = (users ?? []).map((u) => u.id)
    if (!userIds.length) return

    const {data: tokens} = await supabaseAdmin.from('push_tokens').select('token').in('user_id', userIds)
    if (!tokens?.length) return

    const messages = tokens.map((t) => ({
      to: t.token,
      data: {type: 'widget_update'},
      _contentAvailable: true,
      priority: 'high' as const,
    }))

    const result = await sendExpoPushNotifications(messages)
    console.log(`[widget-sync] family=${familyId} sent=${result.sent} failed=${result.failed}`)
  } catch (err) {
    console.error('[widget-sync] push error', err)
  }
}
