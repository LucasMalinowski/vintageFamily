export const PLAN_CODES = ['standard_monthly', 'standard_yearly', 'founders_yearly'] as const

export type PlanCode = (typeof PLAN_CODES)[number]

export const PLAN_NAME: Record<PlanCode, string> = {
  standard_monthly: 'Standard Monthly',
  standard_yearly: 'Standard Yearly',
  founders_yearly: 'Founders Yearly',
}

export const UPGRADE_PATHS: Record<PlanCode, PlanCode[]> = {
  standard_monthly: ['standard_yearly', 'founders_yearly'],
  standard_yearly: [],
  founders_yearly: [],
}

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

export function isPlanCode(value: string): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode)
}
