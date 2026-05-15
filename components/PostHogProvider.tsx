'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { initPostHog, posthog } from '@/lib/posthog'

// All trackable events — import and call posthog.capture() anywhere in the app
export const EVENTS = {
  // Acquisition
  SIGNUP_COMPLETED: 'signup_completed',
  INVITE_ACCEPTED: 'invite_accepted',

  // Activation
  FIRST_EXPENSE_CREATED: 'first_expense_created',
  FIRST_INCOME_CREATED: 'first_income_created',
  FIRST_SAVINGS_GOAL_CREATED: 'first_savings_goal_created',
  WHATSAPP_CONNECTED: 'whatsapp_connected',
  BANK_IMPORT_COMPLETED: 'bank_import_completed',

  // Trial & free tier
  TRIAL_EXPIRY_BANNER_VIEWED: 'trial_expiry_banner_viewed',
  FREE_TIER_ENTERED: 'free_tier_entered',

  // Limits
  WHATSAPP_LIMIT_REACHED: 'whatsapp_limit_reached',
  AI_QUERY_LIMIT_REACHED: 'ai_query_limit_reached',
  EXPORT_IMPORT_LIMIT_REACHED: 'export_import_limit_reached',
  COMPARATIVES_HISTORY_GATE_VIEWED: 'comparatives_history_gate_viewed',

  // Conversion
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',

  // Churn
  CANCELLATION_STARTED: 'cancellation_started',
  TRIAL_EXPIRED_NO_UPGRADE: 'trial_expired_no_upgrade',
} as const

function usePostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initPostHog()
      initialized.current = true
    }
  }, [])

  useEffect(() => {
    if (!pathname) return
    if (posthog.has_opted_out_capturing()) return
    const url = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])
}

function usePostHogIdentify() {
  const { user, familyId } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    if (posthog.has_opted_out_capturing()) return
    posthog.identify(user.id, {
      email: user.email,
      family_id: familyId,
    })
  }, [user?.id, user?.email, familyId])

  useEffect(() => {
    if (!user) {
      posthog.reset()
    }
  }, [user])
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  usePostHogPageView()
  usePostHogIdentify()
  return <>{children}</>
}
