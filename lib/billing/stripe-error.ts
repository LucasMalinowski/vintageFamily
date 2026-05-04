import Stripe from 'stripe'

/**
 * Returns a safe error message for billing API responses.
 * Stripe errors carry user-facing messages designed for display.
 * All other exceptions get a generic fallback to avoid leaking internals.
 */
export function billingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Stripe.errors.StripeError) {
    return error.message
  }
  return fallback
}
