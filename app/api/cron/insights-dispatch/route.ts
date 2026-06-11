import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hasBillingAccess } from '@/lib/billing/access'
import { generateProactiveInsights } from '@/lib/insights/generator'
import { dispatchInsights } from '@/lib/insights/dispatcher'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'
import { acquireFamilyJobLock, getDailyJobPeriod } from '@/lib/jobs/locks'
import { isAuthorizedCronRequest } from '@/lib/security/cron'

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
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isLocalOverrideAllowed = process.env.NODE_ENV !== 'production'
  const force = isLocalOverrideAllowed && request.nextUrl.searchParams.get('force') === '1'
  const familyId = isLocalOverrideAllowed ? request.nextUrl.searchParams.get('family_id') : null
  const today = new Date()

  let familiesQuery = supabaseAdmin
    .from('families')
    .select('id')
    .is('deleted_at', null)

  if (familyId) {
    familiesQuery = familiesQuery.eq('id', familyId)
  }

  const { data: families } = await familiesQuery

  if (!families?.length) return NextResponse.json({ ok: true, dispatched: 0 })

  const period = getCurrentPeriod()
  const periodLabel = getCurrentPeriodLabel()
  const lockPeriod = getDailyJobPeriod(today)
  let dispatched = 0

  // Batch prefetch all members with insights enabled across all families
  const allFamilyIds = families.map(f => f.id)
  const { data: allMembers } = await supabaseAdmin
    .from('users')
    .select('id, family_id, insights_enabled, insight_interval_days')
    .in('family_id', allFamilyIds)
    .eq('insights_enabled', true)

  const membersByFamily = new Map<string, NonNullable<typeof allMembers>>()
  for (const m of allMembers ?? []) {
    const list = membersByFamily.get(m.family_id) ?? []
    list.push(m)
    membersByFamily.set(m.family_id, list)
  }

  for (const family of families) {
    try {
      const members = membersByFamily.get(family.id) ?? []
      if (!members.length) continue

      const access = await hasBillingAccess({ familyId: family.id })
      const hasFullInsightAccess = access.isPaidTier || access.hasActiveTrial

      // Free tier: monthly dispatch only (run on 1st of month)
      // Paid/trial tier: user-configurable interval (weekly/bi-weekly/monthly), checked daily
      const isFirstOfMonth = today.getDate() === 1
      if (!force && !hasFullInsightAccess && !isFirstOfMonth) continue

      // Determine interval preference (paid/trial-tier) and whether this is the
      // first proactive dispatch of the calendar month (used to attach the
      // next-month forecast).
      let isMonthlyDispatch = isFirstOfMonth

      if (hasFullInsightAccess && members[0]) {
        const intervalDays = members[0].insight_interval_days ?? 30
        const { data: lastInsight } = await supabaseAdmin
          .from('insights')
          .select('created_at, period')
          .eq('family_id', family.id)
          .eq('type', 'proactive')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!force && lastInsight?.created_at) {
          const daysSinceLast = (today.getTime() - new Date(lastInsight.created_at).getTime()) / 86_400_000
          if (daysSinceLast < intervalDays) continue
        }

        isMonthlyDispatch = !lastInsight || lastInsight.period !== periodLabel
      }

      if (!force && !(await acquireFamilyJobLock(family.id, 'insights-dispatch', lockPeriod))) {
        continue
      }

      const insights = await generateProactiveInsights(family.id, isMonthlyDispatch)
      if (!insights.length) continue

      await dispatchInsights(family.id, insights, periodLabel, 'proactive')
      dispatched++
    } catch (err) {
      console.error('[insights-dispatch] error for family', family.id, err)
      await posthogLogs.error(
        'Insights dispatch failed for family',
        {
          endpoint: '/api/cron/insights-dispatch',
          family_id: family.id,
        },
        err
      )
    }
  }

  await posthogLogs.info('Insights dispatch completed', {
    endpoint: '/api/cron/insights-dispatch',
    family_count: families.length,
    dispatched,
  })
  await flushPostHogLogs()

  return NextResponse.json({ ok: true, dispatched })
}
