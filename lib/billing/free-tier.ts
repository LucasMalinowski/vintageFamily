import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type UsageCounters = {
  whatsappRecordings: number
  aiQueries: number
  exportImportCount: number
  onDemandInsights: number
}

export async function getUsageCounters(familyId: string): Promise<UsageCounters> {
  const period = getCurrentPeriod()
  const { data } = await supabaseAdmin
    .from('usage_counters')
    .select('whatsapp_recordings, ai_queries, export_import_count, on_demand_insights')
    .eq('family_id', familyId)
    .eq('period', period)
    .maybeSingle()

  return {
    whatsappRecordings: data?.whatsapp_recordings ?? 0,
    aiQueries: data?.ai_queries ?? 0,
    exportImportCount: data?.export_import_count ?? 0,
    onDemandInsights: data?.on_demand_insights ?? 0,
  }
}

async function upsertRecordings(familyId: string, period: string, value: number) {
  await supabaseAdmin.from('usage_counters').upsert(
    { family_id: familyId, period, whatsapp_recordings: value },
    { onConflict: 'family_id,period' }
  )
}

async function upsertAIQueries(familyId: string, period: string, value: number) {
  await supabaseAdmin.from('usage_counters').upsert(
    { family_id: familyId, period, ai_queries: value },
    { onConflict: 'family_id,period' }
  )
}

async function upsertExportImport(familyId: string, period: string, value: number) {
  await supabaseAdmin.from('usage_counters').upsert(
    { family_id: familyId, period, export_import_count: value },
    { onConflict: 'family_id,period' }
  )
}

export async function checkAndIncrementWhatsAppRecording(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const { whatsappRecordings } = await getUsageCounters(familyId)
  const limit = FREE_TIER_LIMITS.whatsappRecordingsPerMonth

  if (whatsappRecordings >= limit) {
    return { allowed: false, remaining: 0 }
  }

  await upsertRecordings(familyId, getCurrentPeriod(), whatsappRecordings + 1)
  return { allowed: true, remaining: limit - (whatsappRecordings + 1) }
}

export async function checkAndIncrementAIQuery(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const { aiQueries } = await getUsageCounters(familyId)
  const limit = FREE_TIER_LIMITS.aiQueriesPerMonth

  if (aiQueries >= limit) {
    return { allowed: false, remaining: 0 }
  }

  await upsertAIQueries(familyId, getCurrentPeriod(), aiQueries + 1)
  return { allowed: true, remaining: limit - (aiQueries + 1) }
}

export async function checkAndIncrementExportImport(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const { exportImportCount } = await getUsageCounters(familyId)
  const limit = FREE_TIER_LIMITS.exportImportPerMonth

  if (exportImportCount >= limit) {
    return { allowed: false, remaining: 0 }
  }

  await upsertExportImport(familyId, getCurrentPeriod(), exportImportCount + 1)
  return { allowed: true, remaining: limit - (exportImportCount + 1) }
}

async function upsertOnDemandInsights(familyId: string, period: string, value: number) {
  await supabaseAdmin.from('usage_counters').upsert(
    { family_id: familyId, period, on_demand_insights: value },
    { onConflict: 'family_id,period' }
  )
}

export async function checkAndIncrementOnDemandInsight(
  familyId: string,
  isPaidTier: boolean
): Promise<{ allowed: boolean; remaining: number }> {
  if (isPaidTier) {
    return { allowed: true, remaining: 999 }
  }

  const { onDemandInsights } = await getUsageCounters(familyId)
  const limit = FREE_TIER_LIMITS.onDemandInsightsFreePerMonth

  if (onDemandInsights >= limit) {
    return { allowed: false, remaining: 0 }
  }

  await upsertOnDemandInsights(familyId, getCurrentPeriod(), onDemandInsights + 1)
  return { allowed: true, remaining: limit - (onDemandInsights + 1) }
}
