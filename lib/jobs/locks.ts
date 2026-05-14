import { supabaseAdmin } from '@/lib/supabaseAdmin'

export function getDailyJobPeriod(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export async function acquireFamilyJobLock(familyId: string, jobType: string, period: string) {
  const { error } = await supabaseAdmin
    .from('family_job_locks')
    .insert({
      family_id: familyId,
      job_type: jobType,
      period,
    })

  if (!error) return true
  if (error.code === '23505') return false
  throw error
}
