'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('florim_cookie_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('florim_cookie_consent', 'accepted')
    console.log('[Florim] Analytics cookies accepted.')
    setVisible(false)
  }

  function reject() {
    localStorage.setItem('florim_cookie_consent', 'rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white border border-border rounded-lg shadow-vintage px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-ink/75 font-body flex-1 leading-relaxed">
          Usamos cookies essenciais para o funcionamento do serviço e cookies analíticos para melhorar sua experiência.{' '}
          <Link href="/cookies" className="text-coffee underline underline-offset-2 hover:text-coffee/80 transition-vintage">
            Saiba mais
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={reject}
            className="px-4 py-2 text-sm font-body text-ink/70 border border-border rounded-full hover:bg-paper transition-vintage"
          >
            Rejeitar
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-body bg-coffee text-paper rounded-full hover:bg-coffee/90 transition-vintage"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
