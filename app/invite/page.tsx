'use client'

import Image from 'next/image'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

type InviteInfo = {
  email: string
  familyName: string
}

function InvitePageContent() {
  const t = useTranslations('invite')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, acceptInvite } = useAuth()
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const submittedRef = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (submittedRef.current) return
    if (user) {
      router.push('/inicio')
    }
  }, [user, router])

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError(t('errors.invalid'))
        setLoading(false)
        return
      }

      const response = await fetch(`/api/invites/lookup?token=${token}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setError(payload?.error || t('errors.invalid'))
        setLoading(false)
        return
      }

      const payload = await response.json()
      setInviteInfo({ email: payload.email, familyName: payload.familyName })
      setLoading(false)
    }

    fetchInvite()
  }, [token, t])

  useEffect(() => {
    if (!token) return
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (!isMobile) return
    window.location.href = `florim://invite?token=${token}`
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!inviteInfo || !token) return

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('errors.passwordTooShort'))
      return
    }

    submittedRef.current = true
    setSubmitting(true)

    try {
      await acceptInvite(token, inviteInfo.email, name, password)
    } catch (err: any) {
      submittedRef.current = false
      setError(err.message || t('errors.acceptError'))
    } finally {
      setSubmitting(false)
    }
  }

  const agreementLabel = (
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
  )

  const formBody = loading ? (
    <p className="text-sm text-ink/60 font-body">{t('loading')}</p>
  ) : (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
      {error && (
        <div className="bg-gold/10 border border-gold/30 text-gold px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {inviteInfo && (
        <div className="bg-paper border border-border rounded-lg px-4 py-3 text-sm text-ink/70 font-body">
          {t('invited', { family: inviteInfo.familyName })}
        </div>
      )}

      <div>
        <label htmlFor="invite-email" className="block text-sm font-body text-ink mb-2">{t('emailLabel')}</label>
        <input
          id="invite-email"
          type="email"
          value={inviteInfo?.email ?? ''}
          disabled
          readOnly
          className="w-full px-4 py-3 bg-offWhite border border-border rounded-full text-ink/60"
        />
      </div>

      <div>
        <label htmlFor="invite-name" className="block text-sm font-body text-ink mb-2">{t('nameLabel')}</label>
        <input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-full px-4 py-3 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
          placeholder={t('namePlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="invite-password" className="block text-sm font-body text-ink mb-2">{t('passwordLabel')}</label>
        <div className="relative">
          <input
            id="invite-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 pr-11 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="invite-confirm-password" className="block text-sm font-body text-ink mb-2">{t('confirmPasswordLabel')}</label>
        <div className="relative">
          <input
            id="invite-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 pr-11 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          id="invite-agreement"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 accent-coffee"
          required
        />
        {agreementLabel}
      </label>

      <button
        type="submit"
        disabled={submitting || !agreed}
        className="w-full bg-sidebar text-paper py-[14px] rounded-full font-bold text-[15px] hover:opacity-90 transition-vintage disabled:opacity-50"
      >
        {submitting ? t('submittingButton') : t('submitButton')}
      </button>
    </form>
  )

  return (
    <div className="min-h-screen bg-sidebar text-paper relative">

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Logo centered at top */}
        <div className="flex justify-center pt-12 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/logo-florim.png" alt="Florim" width={72} height={72} className="object-contain" />
        </div>

        {/* Quote / invite context */}
        <div className="flex-1 flex items-center justify-center px-10 py-8">
          <p className="font-serif italic text-[18px] text-gold text-center leading-[1.55]">
            &ldquo;{t('quote')}&rdquo;
          </p>
        </div>

        {/* Form card - bottom sheet */}
        <div className="bg-paper rounded-t-[28px] px-7 pt-8 pb-10 shrink-0 overflow-y-auto max-h-[72vh]">
          <h2 className="font-serif text-[22px] text-coffee mb-5">{t('title')}</h2>
          {formBody}
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <div className="hidden md:flex min-h-screen items-center justify-center px-6 py-10 relative">
        <Image
          src="/logo-florim.png"
          alt="Florim"
          width={128}
          height={128}
          className="object-contain absolute left-8 top-8"
        />

        <div className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-2xl md:text-2xl font-serif italic text-gold leading-relaxed max-w-sm mx-auto md:mx-0">
              {t('quote')}
            </p>
          </div>

          <div className="bg-paper backdrop-blur-sm rounded-[28px] border border-border/70 shadow-vintage p-12 w-full md:max-w-xl md:-translate-y-6">
            <h2 className="text-2xl font-serif text-coffee mb-6">{t('title')}</h2>
            {loading ? (
              <p className="text-sm text-ink/60 font-body">{t('loading')}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-gold/10 border border-gold/30 text-gold px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {inviteInfo && (
                  <div className="bg-paper border border-border rounded-lg px-4 py-3 text-sm text-ink/70 font-body">
                    {t('invited', { family: inviteInfo.familyName })}
                  </div>
                )}

                <div>
                  <label htmlFor="invite-desktop-email" className="block text-sm font-body text-ink mb-2">{t('emailLabel')}</label>
                  <input
                    id="invite-desktop-email"
                    type="email"
                    value={inviteInfo?.email ?? ''}
                    disabled
                    readOnly
                    className="w-full px-4 py-3 bg-white/70 border border-border rounded-full text-ink/60"
                  />
                </div>

                <div>
                  <label htmlFor="invite-desktop-name" className="block text-sm font-body text-ink mb-2">{t('nameLabel')}</label>
                  <input
                    id="invite-desktop-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                    placeholder={t('namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="invite-desktop-password" className="block text-sm font-body text-ink mb-2">{t('passwordLabel')}</label>
                  <div className="relative">
                    <input
                      id="invite-desktop-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="invite-desktop-confirm-password" className="block text-sm font-body text-ink mb-2">{t('confirmPasswordLabel')}</label>
                  <div className="relative">
                    <input
                      id="invite-desktop-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="invite-desktop-agreement"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 accent-coffee"
                    required
                  />
                  <span className="text-sm font-body text-ink/70 leading-relaxed">
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
                  disabled={submitting || !agreed}
                  className="w-full bg-sidebar text-paper py-3 rounded-full font-semibold hover:opacity-90 transition-vintage disabled:opacity-50"
                >
                  {submitting ? t('submittingButton') : t('submitButton')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading…</div>}>
      <InvitePageContent />
    </Suspense>
  )
}
