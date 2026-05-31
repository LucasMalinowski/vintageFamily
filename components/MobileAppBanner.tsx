'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'florim_app_banner_dismissed'

const STORE_URLS = {
  ios: 'https://apps.apple.com/app/florim/id6739168371',
  android: 'https://play.google.com/store/apps/details?id=app.florim.app',
}

function detectMobileOS(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return null
}

export default function MobileAppBanner() {
  const [visible, setVisible] = useState(false)
  const [os, setOs] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    const detectedOs = detectMobileOS()
    if (!detectedOs) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    fetch('/api/config/app-banner')
      .then(r => r.json())
      .then((cfg: { ios: boolean; android: boolean }) => {
        if (cfg[detectedOs]) {
          setOs(detectedOs)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible || !os) return null

  const storeLabel = os === 'ios' ? 'App Store' : 'Google Play'
  const storeUrl = STORE_URLS[os]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-slide-up">
      <div className="max-w-sm mx-auto bg-sidebar text-paper rounded-2xl shadow-vintage px-5 py-4 flex items-center gap-4">
        <img src="/logo-small.png" alt="Florim" className="w-10 h-10 rounded-xl shrink-0 object-cover" />

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-body font-semibold leading-tight">Florim no seu bolso</p>
          <p className="text-[12px] font-body text-paper/70 mt-0.5 leading-tight">
            Baixe o app e gerencie suas finanças de qualquer lugar.
          </p>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-block mt-2 px-3 py-1 bg-gold text-ink text-[11px] font-body font-semibold rounded-full hover:opacity-90 transition-vintage"
          >
            Baixar na {storeLabel}
          </a>
        </div>

        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-paper/50 hover:text-paper transition-vintage -mt-1 -mr-1"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
