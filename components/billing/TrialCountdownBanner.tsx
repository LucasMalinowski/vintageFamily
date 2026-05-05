'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePlan } from '@/lib/billing/plan-context'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

export default function TrialCountdownBanner() {
  const { tier, trialDaysLeft } = usePlan()
  const isVisible = tier === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 5

  useEffect(() => {
    if (isVisible && !sessionStorage.getItem('trial_banner_seen')) {
      posthog.capture(EVENTS.TRIAL_EXPIRY_BANNER_VIEWED, { days_left: trialDaysLeft })
      sessionStorage.setItem('trial_banner_seen', '1')
    }
  }, [isVisible]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isVisible) return null

  const isLastDay = trialDaysLeft === 0

  return (
    <div className="w-full bg-gold/15 border-b border-gold/30 px-4 py-2.5 flex items-center justify-between gap-4">
      <p className="text-sm text-coffee font-medium">
        {isLastDay
          ? 'Seu período de avaliação termina hoje.'
          : `Seu período de avaliação termina em ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'}.`}
        {' '}Após isso, você continua no plano gratuito.
      </p>
      <Link
        href="/pricing"
        className="shrink-0 text-sm font-semibold text-petrol hover:underline"
      >
        Ver planos
      </Link>
    </div>
  )
}
