'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { parseAuthHandoffLocation } from '@/lib/billing/auth-handoff'
import { useTranslations } from 'next-intl'

export default function AuthHandoffPage() {
  const t = useTranslations('authHandoff')
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const { tokenHash, accessToken, refreshToken } = parseAuthHandoffLocation(
      window.location.search,
      window.location.hash
    )

    if (tokenHash) {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }).then(({ error }) => {
        if (error) {
          setFailed(true)
        } else {
          router.replace('/settings/billing')
        }
      })
      return
    }

    if (!accessToken || !refreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true)
      return
    }

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (error) {
        setFailed(true)
      } else {
        router.replace('/settings/billing')
      }
    })
  }, [router])

  if (failed) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center">
        <div className="bg-paper rounded-[28px] px-8 py-10 text-center max-w-sm w-full">
          <p className="font-serif text-[20px] text-coffee mb-2">{t('errorTitle')}</p>
          <p className="text-sm text-ink/60 mb-6">{t('errorSubtitle')}</p>
          <Link
            href="/login"
            className="inline-block bg-sidebar text-paper px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-vintage"
          >
            {t('loginLink')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center">
      <div className="bg-paper rounded-[28px] px-8 py-10 text-center max-w-sm w-full">
        <p className="font-serif text-[20px] text-coffee mb-2">{t('title')}</p>
        <p className="text-sm text-ink/60">{t('subtitle')}</p>
      </div>
    </div>
  )
}
