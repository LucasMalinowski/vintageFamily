'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { grantAnalyticsConsent, revokeAnalyticsConsent } from '@/lib/posthog'

export function openCookiePreferences() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('florim:open-cookie-preferences'))
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !localStorage.getItem('florim_cookie_consent')
  })
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white border border-border rounded-lg shadow-vintage px-5 py-4">
        {!showManage ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-ink/75 font-body flex-1 leading-relaxed">
              Usamos cookies essenciais para o funcionamento do serviço e cookies analíticos para melhorar sua experiência.{' '}
              <Link href="/cookies" className="text-coffee underline underline-offset-2 hover:text-coffee/80 transition-vintage">
                Saiba mais
              </Link>
            </p>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button
                onClick={reject}
                className="px-4 py-2 text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                Rejeitar
              </button>
              <button
                onClick={() => setShowManage(true)}
                className="px-4 py-2 text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                Gerenciar
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-sm font-body bg-coffee text-paper rounded-full hover:bg-coffee/90 transition-vintage"
              >
                Aceitar todos
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-body font-semibold text-ink">Preferências de cookies</p>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-body font-medium text-ink">Essenciais</p>
                  <p className="text-xs text-ink/60 font-body mt-0.5">Necessários para o funcionamento do serviço.</p>
                </div>
                <span className="text-xs text-ink/50 font-body shrink-0 mt-1">Sempre ativo</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-body font-medium text-ink">Analíticos (PostHog)</p>
                  <p className="text-xs text-ink/60 font-body mt-0.5">
                    Usados para entender como o Florim é utilizado. Processados nos EUA pela PostHog, Inc.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="mt-1 shrink-0 accent-coffee"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowManage(false)}
                className="px-4 py-2 text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
              >
                Cancelar
              </button>
              <button
                onClick={savePreferences}
                className="px-4 py-2 text-sm font-body bg-coffee text-paper rounded-full hover:bg-coffee/90 transition-vintage"
              >
                Salvar preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
