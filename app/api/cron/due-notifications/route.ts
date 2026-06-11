import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { acquireFamilyJobLock, getDailyJobPeriod } from '@/lib/jobs/locks'
import { sendExpoPushNotifications, type ExpoPushMessage } from '@/lib/notifications/push'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'
import { isAuthorizedCronRequest } from '@/lib/security/cron'

/**
 * GET /api/cron/due-notifications
 *
 * Scheduled daily at 09:00 BRT (12:00 UTC) by Vercel Cron.
 * Sends Expo push notifications (→ FCM / APNs) for:
 *   - Expenses whose `date` is exactly 2 days from now and not yet paid
 *   - Reminders whose `due_date` is exactly 1 day from now and not done
 *
 * Uses family_job_locks to guarantee at-most-once delivery per family per day.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const period = getDailyJobPeriod(today)

  // Target dates (UTC date strings — DB stores dates without timezone)
  const in2Days = new Date(today)
  in2Days.setUTCDate(in2Days.getUTCDate() + 2)
  const in2DaysStr = in2Days.toISOString().slice(0, 10)

  const in1Day = new Date(today)
  in1Day.setUTCDate(in1Day.getUTCDate() + 1)
  const in1DayStr = in1Day.toISOString().slice(0, 10)

  // Fetch all due items in parallel
  const [{ data: expenses }, { data: reminders }] = await Promise.all([
    supabaseAdmin
      .from('expenses')
      .select('family_id, description')
      .eq('date', in2DaysStr)
      .neq('status', 'paid'),
    supabaseAdmin
      .from('reminders')
      .select('family_id, title')
      .eq('due_date', in1DayStr)
      .eq('is_done', false),
  ])

  const familyIds = [
    ...new Set([
      ...(expenses ?? []).map((e) => e.family_id),
      ...(reminders ?? []).map((r) => r.family_id),
    ]),
  ].filter(Boolean) as string[]

  if (!familyIds.length) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'nothing due' })
  }

  // Get users + their push tokens for those families
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, family_id')
    .in('family_id', familyIds)

  const userIds = (users ?? []).map((u) => u.id)

  const { data: tokens } = userIds.length
    ? await supabaseAdmin.from('push_tokens').select('user_id, token').in('user_id', userIds)
    : { data: [] }

	  // Build family_id → push tokens[] map
	  const tokensByUserId = new Map<string, string[]>()
	  for (const tokenRow of tokens ?? []) {
	    const userTokens = tokensByUserId.get(tokenRow.user_id) ?? []
	    userTokens.push(tokenRow.token)
	    tokensByUserId.set(tokenRow.user_id, userTokens)
	  }

	  const familyTokens = new Map<string, string[]>()
	  for (const user of users ?? []) {
	    const userTokens = tokensByUserId.get(user.id) ?? []
	    if (!userTokens.length) continue
	    familyTokens.set(user.family_id, [
      ...(familyTokens.get(user.family_id) ?? []),
      ...userTokens,
    ])
  }

  const messages: ExpoPushMessage[] = []
  let skipped = 0

  for (const familyId of familyIds) {
    const deviceTokens = familyTokens.get(familyId)
    if (!deviceTokens?.length) continue

    // At-most-once per family per day
    const locked = await acquireFamilyJobLock(familyId, 'due-notifications', period)
    if (!locked) {
      skipped++
      continue
    }

    const familyExpenses = (expenses ?? []).filter((e) => e.family_id === familyId)
    const familyReminders = (reminders ?? []).filter((r) => r.family_id === familyId)

    for (const expense of familyExpenses) {
      for (const token of deviceTokens) {
        messages.push({
          to: token,
          title: '💸 Despesa a vencer',
          body: `"${expense.description}" vence em 2 dias.`,
          sound: 'default',
          channelId: 'default', // uses expo-notifications channel with custom icon + #3E5F4B colour
          data: { type: 'expense' },
        })
      }
    }

    for (const reminder of familyReminders) {
      for (const token of deviceTokens) {
        messages.push({
          to: token,
          title: '🔔 Lembrete do Florim',
          body: reminder.title,
          sound: 'default',
          channelId: 'default',
          data: { type: 'reminder' },
        })
      }
    }
  }

  const { sent, failed } = await sendExpoPushNotifications(messages)

  posthogLogs.info('Due notifications sent', {
    endpoint: '/api/cron/due-notifications',
    period,
    families_processed: familyIds.length - skipped,
    families_skipped: skipped,
    expenses_due: expenses?.length ?? 0,
    reminders_due: reminders?.length ?? 0,
    sent,
    failed,
  })
  await flushPostHogLogs()

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skipped,
    period,
  })
}
