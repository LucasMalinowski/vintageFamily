import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // handled manually via usePostHogPageView
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  })
}

export { posthog }
