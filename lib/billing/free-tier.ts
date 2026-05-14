import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FREE_TIER_LIMITS } from '@/lib/billing/constants'

function getCurrentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type UsageCounters = {
  whatsappRecordings: number
  audioMessages: number
  aiQueries: number
  exportImportCount: number
  onDemandInsights: number
}

export async function getUsageCounters(familyId: string): Promise<UsageCounters> {
  const period = getCurrentPeriod()
  const { data } = await supabaseAdmin
    .from('usage_counters')
    .select('whatsapp_recordings, audio_messages, ai_queries, export_import_count, on_demand_insights')
    .eq('family_id', familyId)
    .eq('period', period)
    .maybeSingle()

  return {
    whatsappRecordings: data?.whatsapp_recordings ?? 0,
    audioMessages: data?.audio_messages ?? 0,
    aiQueries: data?.ai_queries ?? 0,
    exportImportCount: data?.export_import_count ?? 0,
    onDemandInsights: data?.on_demand_insights ?? 0,
  }
}

async function incrementUsageCounter(
  familyId: string,
  counter: 'whatsapp_recordings' | 'ai_queries' | 'audio_messages' | 'export_import_count' | 'on_demand_insights',
  limit: number
) {
  const { data, error } = await supabaseAdmin.rpc('increment_usage_counter', {
    p_family_id: familyId,
    p_period: getCurrentPeriod(),
    p_counter: counter,
    p_limit: limit,
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] as { allowed: boolean; new_value: number } | undefined : null
  const value = row?.new_value ?? limit
  return { allowed: Boolean(row?.allowed), remaining: Math.max(0, limit - value) }
}

export async function checkAndIncrementWhatsAppRecording(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = FREE_TIER_LIMITS.whatsappRecordingsPerMonth
  return incrementUsageCounter(familyId, 'whatsapp_recordings', limit)
}

export async function checkAndIncrementAIQuery(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = FREE_TIER_LIMITS.aiQueriesPerMonth
  return incrementUsageCounter(familyId, 'ai_queries', limit)
}

export async function checkAndIncrementAudioMessage(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = FREE_TIER_LIMITS.audioMessagesPerMonth
  return incrementUsageCounter(familyId, 'audio_messages', limit)
}

export async function checkAndIncrementExportImport(
  familyId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const limit = FREE_TIER_LIMITS.exportImportPerMonth
  return incrementUsageCounter(familyId, 'export_import_count', limit)
}

export async function checkAndIncrementOnDemandInsight(
  familyId: string,
  isPaidTier: boolean
): Promise<{ allowed: boolean; remaining: number }> {
  if (isPaidTier) {
    return { allowed: true, remaining: 999 }
  }

  const limit = FREE_TIER_LIMITS.onDemandInsightsFreePerMonth
  return incrementUsageCounter(familyId, 'on_demand_insights', limit)
}
