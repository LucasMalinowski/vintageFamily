import posthog from 'posthog-js'

function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('florim_cookie_consent') === 'accepted'
}

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (!hasAnalyticsConsent()) ph.opt_out_capturing()
    },
  })
}

export function grantAnalyticsConsent() {
  posthog.opt_in_capturing()
}

export function revokeAnalyticsConsent() {
  posthog.opt_out_capturing()
}

export { posthog }
