import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(stripeSecretKey, {
  appInfo: {
    name: 'fintech-vintage',
  },
})

export function getPriceIdByPlanCode(planCode: string) {
  const mapping: Record<string, string | undefined> = {
    standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
    founders_yearly: process.env.STRIPE_PRICE_FOUNDERS_YEARLY,
  }

  const priceId = mapping[planCode]
  if (!priceId) {
    throw new Error(`Stripe price id missing for plan code: ${planCode}`)
  }

  return priceId
}

export function getPlanCodeByPriceId(priceId: string | null | undefined) {
  if (!priceId) return null

  const mapping: Record<string, string | undefined> = {
    [process.env.STRIPE_PRICE_STANDARD_MONTHLY ?? '']: 'standard_monthly',
    [process.env.STRIPE_PRICE_STANDARD_YEARLY ?? '']: 'standard_yearly',
    [process.env.STRIPE_PRICE_FOUNDERS_YEARLY ?? '']: 'founders_yearly',
  }

  return mapping[priceId] ?? null
}

export const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
  'incomplete',
  'unpaid',
  'paused',
])
