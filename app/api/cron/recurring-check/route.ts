import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { detectAndUpsertRecurringPatterns } from '@/lib/recurring/detector'
import { launchDueRecurringItems } from '@/lib/recurring/launcher'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'
import { acquireFamilyJobLock, getDailyJobPeriod } from '@/lib/jobs/locks'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all active families
  const { data: families } = await supabaseAdmin
    .from('families')
    .select('id')
    .is('deleted_at', null)

  if (!families?.length) return NextResponse.json({ ok: true, families: 0 })

  let totalDetected = 0
  let totalLaunched = 0
  const period = getDailyJobPeriod()

  for (const family of families) {
    try {
      if (await acquireFamilyJobLock(family.id, 'recurring-detect', period)) {
        totalDetected += await detectAndUpsertRecurringPatterns(family.id)
      }

      if (await acquireFamilyJobLock(family.id, 'recurring-launch', period)) {
        totalLaunched += await launchDueRecurringItems(family.id)
      }
    } catch (err) {
      console.error('[recurring-check] detect error', family.id, err)
      posthogLogs.error(
        'Recurring detection failed for family',
        {
          endpoint: '/api/cron/recurring-check',
          family_id: family.id,
        },
        err
      )
    }
  }

  posthogLogs.info('Recurring check completed', {
    endpoint: '/api/cron/recurring-check',
    family_count: families.length,
    total_detected: totalDetected,
    total_launched: totalLaunched,
  })
  await flushPostHogLogs()

  return NextResponse.json({ ok: true, families: families.length, totalDetected, totalLaunched })
}
