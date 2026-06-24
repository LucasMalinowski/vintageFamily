'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { grantAnalyticsConsent, revokeAnalyticsConsent } from '@/lib/posthog'

export function openCookiePreferences() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('florim:open-cookie-preferences'))
  }
}

export default function CookieBanner() {
  const t = useTranslations()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('florim_cookie_consent')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true)
    }
  }, [])
  const [showManage, setShowManage] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)

  useEffect(() => {
    function handleOpen() {
      setShowManage(false)
      setAnalyticsEnabled(
        localStorage.getItem('florim_cookie_consent') !== 'rejected'
      )
      setVisible(true)
    }
    window.addEventListener('florim:open-cookie-preferences', handleOpen)
    return () => window.removeEventListener('florim:open-cookie-preferences', handleOpen)
  }, [])

  function accept() {
    localStorage.setItem('florim_cookie_consent', 'accepted')
    grantAnalyticsConsent()
    window.dispatchEvent(new CustomEvent('florim:consent-changed', { detail: 'accepted' }))
    setVisible(false)
  }

  function reject() {
    localStorage.setItem('florim_cookie_consent', 'rejected')
    revokeAnalyticsConsent()
    window.dispatchEvent(new CustomEvent('florim:consent-changed', { detail: 'rejected' }))
    setVisible(false)
  }

  function savePreferences() {
    if (analyticsEnabled) {
      accept()
    } else {
      reject()
    }
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2.5 sm:p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.625rem)' }}>
      <div className="max-w-2xl mx-auto bg-white border border-border rounded-lg shadow-vintage px-4 py-2.5 sm:px-5 sm:py-4">
        {!showManage ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <p className="text-[13px] sm:text-sm text-ink/75 font-body flex-1 leading-tight sm:leading-relaxed">
              {t('cookie.message')}{' '}
              <Link href="/cookies" className="text-coffee underline underline-offset-2 hover:text-coffee/80 transition-vintage">
                {t('cookie.policy')}
              </Link>
            </p>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={reject}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                {t('cookie.decline')}
              </button>
              <button
                type="button"
                onClick={() => setShowManage(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                {t('cookie.manage')}
              </button>
              <button
                type="button"
                onClick={accept}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm font-body bg-coffee text-paper rounded-full hover:bg-coffee/90 transition-vintage"
              >
                {t('cookie.accept')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-body font-semibold text-ink">{t('cookie.preferencesTitle')}</p>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-body font-medium text-ink">{t('cookie.essentialsTitle')}</p>
                  <p className="text-xs text-ink/60 font-body mt-0.5">{t('cookie.essentialsDesc')}</p>
                </div>
                <span className="text-xs text-ink/50 font-body shrink-0 mt-1">{t('cookie.alwaysActive')}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-body font-medium text-ink">{t('cookie.analyticsTitle')}</p>
                  <p className="text-xs text-ink/60 font-body mt-0.5">
                    {t('cookie.analyticsDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="mt-1 shrink-0 accent-coffee"
                  aria-label={t('cookie.analyticsAria')}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowManage(false)}
                className="px-4 py-2 text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={savePreferences}
                className="px-4 py-2 text-sm font-body bg-coffee text-paper rounded-full hover:bg-coffee/90 transition-vintage"
              >
                {t('cookie.savePreferences')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
