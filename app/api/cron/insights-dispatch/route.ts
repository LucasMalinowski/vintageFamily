import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hasBillingAccess } from '@/lib/billing/access'
import { generateProactiveInsights } from '@/lib/insights/generator'
import { dispatchInsights } from '@/lib/insights/dispatcher'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'

function getCurrentPeriodLabel(): string {
  const now = new Date()
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[now.getMonth()]} ${now.getFullYear()}`
}

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const dayOfWeek = today.getDay() // 1 = Monday

  const { data: families } = await supabaseAdmin
    .from('families')
    .select('id')
    .is('deleted_at', null)

  if (!families?.length) return NextResponse.json({ ok: true, dispatched: 0 })

  const period = getCurrentPeriod()
  const periodLabel = getCurrentPeriodLabel()
  let dispatched = 0

  for (const family of families) {
    try {
      // Check if at least one member has insights enabled
      const { data: members } = await supabaseAdmin
        .from('users')
        .select('id, insights_enabled, insight_interval_days')
        .eq('family_id', family.id)
        .eq('insights_enabled', true)
        .limit(1)

      if (!members?.length) continue

      const access = await hasBillingAccess({ familyId: family.id })
      const hasFullInsightAccess = access.isPaidTier || access.hasActiveTrial

      // Free tier: monthly dispatch only (run on 1st of month, dayOfWeek check skipped)
      // Paid/trial tier: weekly dispatch (every Monday)
      const isFirstOfMonth = today.getDate() === 1
      if (!hasFullInsightAccess && !isFirstOfMonth) continue
      if (hasFullInsightAccess && dayOfWeek !== 1) continue

      // Check interval preference (paid/trial-tier user-configurable)
      if (hasFullInsightAccess && members[0]) {
        const intervalDays = members[0].insight_interval_days ?? 30
        const { data: lastInsight } = await supabaseAdmin
          .from('insights')
          .select('created_at')
          .eq('family_id', family.id)
          .eq('type', 'proactive')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastInsight?.created_at) {
          const daysSinceLast = (today.getTime() - new Date(lastInsight.created_at).getTime()) / 86_400_000
          if (daysSinceLast < intervalDays) continue
        }
      }

      const insights = await generateProactiveInsights(family.id)
      if (!insights.length) continue

      await dispatchInsights(family.id, insights, periodLabel, 'proactive')
      dispatched++
    } catch (err) {
      console.error('[insights-dispatch] error for family', family.id, err)
      posthogLogs.error(
        'Insights dispatch failed for family',
        {
          endpoint: '/api/cron/insights-dispatch',
          family_id: family.id,
        },
        err
      )
    }
  }

  posthogLogs.info('Insights dispatch completed', {
    endpoint: '/api/cron/insights-dispatch',
    family_count: families.length,
    dispatched,
  })
  await flushPostHogLogs()

  return NextResponse.json({ ok: true, dispatched })
}
