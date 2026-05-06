export const PLAN_CODES = ['standard_monthly', 'standard_yearly', 'founders_monthly', 'founders_yearly'] as const

export type PlanCode = (typeof PLAN_CODES)[number]

export const PLAN_NAME: Record<PlanCode, string> = {
  standard_monthly: 'Plano Mensal',
  standard_yearly: 'Plano Anual',
  founders_monthly: 'Plano Fundadores Mensal',
  founders_yearly: 'Plano Fundadores Anual',
}

export const UPGRADE_PATHS: Record<PlanCode, PlanCode[]> = {
  standard_monthly: ['standard_yearly'],
  standard_yearly: [],
  founders_monthly: ['founders_yearly', 'standard_yearly'],
  founders_yearly: ['standard_yearly'],
}

export const DOWNGRADE_PATHS: Record<PlanCode, PlanCode[]> = {
  standard_monthly: [],
  standard_yearly: ['standard_monthly'],
  founders_monthly: [],
  founders_yearly: ['founders_monthly', 'standard_monthly'],
}

export function isFoundersPlan(planCode: string): boolean {
  return planCode === 'founders_monthly' || planCode === 'founders_yearly'
}

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function isPlanCode(value: string): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode)
}

export const FREE_TIER_LIMITS = {
  whatsappRecordingsPerMonth: 75,
  aiQueriesPerMonth: 15,
  exportImportPerMonth: 3,
  comparativeHistoryMonths: 2,
  onDemandInsightsFreePerMonth: 3,
  onDemandInsightsPaidPerMonth: 10,
  proactiveInsightsFreePerMonth: 2,
} as const
