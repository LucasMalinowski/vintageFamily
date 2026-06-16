'use client'

/**
 * /signup/sso-complete — Shown to brand-new SSO users (Google / Apple) who
 * have authenticated but haven't created their family profile yet.
 *
 * The /auth/callback route redirects here when it detects a new user.
 * We collect the user's display name (pre-filled from their SSO provider)
 * and their chosen family name, then call /api/families/create.
 */

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import { useTranslations } from 'next-intl'

export default function SSOCompletePage() {
  const t = useTranslations('ssoComplete')
  const { user, authStatus, familyId } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already has a family or is not authenticated.
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login')
      return
    }
    if (authStatus === 'authenticated' && familyId) {
      router.replace('/inicio')
    }
  }, [authStatus, familyId, router])

  // Pre-fill name from SSO provider metadata.
  useEffect(() => {
    if (user && !name) {
      const providerName: string =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        ''
      if (providerName) setName(providerName)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanName = name.trim()
    const cleanFamilyName = familyName.trim()

    if (!cleanName) {
      setError(t('errors.nameRequired'))
      return
    }
    if (!cleanFamilyName) {
      setError(t('errors.familyNameRequired'))
      return
    }
    if (!agreed) {
      setError(t('errors.termsRequired'))
      return
    }

    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error(t('errors.sessionNotFound'))

      const email = user?.email ?? ''
      const response = await fetch('/api/families/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ familyName: cleanFamilyName, name: cleanName, email }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || t('errors.createError'))
      }

      const payload = await response.json()
      posthog.capture(EVENTS.SIGNUP_COMPLETED, {
        family_id: payload.familyId,
        method: 'sso',
      })

      // AuthProvider will pick up the new familyId via its Supabase subscription.
      router.replace('/inicio')
    } catch (err: any) {
      setError(err.message || t('errors.createFamilyError'))
    } finally {
      setLoading(false)
    }
  }

  // Show nothing while auth state is resolving.
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-coffee border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:items-center md:justify-center md:p-4">

      {/* Header */}
      <div className="pt-12 pb-2 px-7 text-center md:mb-8 md:pt-0 shrink-0">
        <Image
          src="/logo.png"
          alt="Florim"
          width={80}
          height={80}
          className="w-[52px] h-[52px] md:w-20 md:h-20 object-contain mx-auto mb-3"
        />
        <h1 className="font-serif text-[26px] md:text-4xl text-coffee mb-2">
          {t('title')}
        </h1>
        <p className="text-ink/60 italic font-body text-[13px] md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 md:flex-none w-full md:max-w-md md:bg-offWhite md:rounded-vintage md:border md:border-border md:shadow-vintage md:p-8 overflow-y-auto">
        <div className="px-7 pb-10 md:px-0 md:pb-0">
          {error && (
            <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-body text-ink mb-2">
                {t('nameLabel')}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="familyName" className="block text-sm font-body text-ink mb-2">
                {t('familyNameLabel')}
              </label>
              <input
                id="familyName"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder={t('familyNamePlaceholder')}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 accent-coffee"
                required
              />
              <span className="text-[12px] md:text-sm font-body text-ink/70 leading-relaxed">
                {t('agreementPrefix')}{' '}
                <Link href="/terms" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                  {t('termsLink')}
                </Link>{' '}
                {t('agreementMiddle')}{' '}
                <Link href="/privacy" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                  {t('privacyLink')}
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coffee text-paper py-[14px] rounded-[10px] font-body font-bold text-[15px] hover:bg-coffee/90 transition-vintage disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('submittingButton') : t('submitButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
