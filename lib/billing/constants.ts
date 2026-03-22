export const PLAN_CODES = ['standard_monthly', 'standard_yearly', 'founders_yearly'] as const

export type PlanCode = (typeof PLAN_CODES)[number]

export const PLAN_NAME: Record<PlanCode, string> = {
  standard_monthly: 'Plano Mensal',
  standard_yearly: 'Plano Anual',
  founders_yearly: 'Plano Fundadores',
}

export const UPGRADE_PATHS: Record<PlanCode, PlanCode[]> = {
  standard_monthly: ['standard_yearly', 'founders_yearly'],
  standard_yearly: [],
  founders_yearly: ['standard_yearly'],
}

export const DOWNGRADE_PATHS: Record<PlanCode, PlanCode[]> = {
  standard_monthly: [],
  standard_yearly: ['standard_monthly', 'founders_yearly'],
  founders_yearly: ['standard_monthly'],
}

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function isPlanCode(value: string): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode)
}
