'use client'

import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'pwa-install-dismissed'

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export default function PwaInstallPrompt() {
  const [iosPromptVisible, setIosPromptVisible] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [androidPromptVisible, setAndroidPromptVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    if (dismissed || isStandaloneMode()) return

    if (isIosDevice()) {
      setIosPromptVisible(true)
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setAndroidPromptVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const dismiss = () => {
    setIosPromptVisible(false)
    setAndroidPromptVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setAndroidPromptVisible(false)
    setInstallEvent(null)
  }

  if (!iosPromptVisible && !androidPromptVisible) return null

  return (
    <div className="fixed inset-x-4 bottom-4 z-50">
      <div className="bg-bg border border-border shadow-vintage rounded-vintage p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-ink/80 font-body">
          {iosPromptVisible ? (
            <>
              Instale este app: toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </>
          ) : (
            <>Instale este app para acessar mais rápido no seu celular.</>
          )}
        </div>
        <div className="flex items-center gap-2">
          {androidPromptVisible && (
            <button
              onClick={handleInstall}
              className="px-3 py-2 text-sm bg-petrol text-paper rounded-lg hover:bg-petrol/90 transition-vintage"
            >
              Instalar
            </button>
          )}
          <button
            onClick={dismiss}
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-paper transition-vintage"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
