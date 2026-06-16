'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { SSOButtons, SSODivider } from '@/components/SSOButtons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function SignUpPage() {
  const { signUp, user, authStatus } = useAuth()
  const router = useRouter()
  const t = useTranslations('signup')

  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (submittedRef.current) return
    if (!loading && user && authStatus === 'authenticated') router.replace('/inicio')
  }, [authStatus, loading, user, router])

  const cleanName = name.trim()
  const cleanFamilyName = familyName.trim()
  const cleanEmail = email.trim()
  const passwordsMatch = password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!cleanName || !cleanFamilyName || !cleanEmail) {
      setError(t('errors.requiredFields'))
      return
    }

    if (!agreed) {
      setError(t('errors.termsRequired'))
      return
    }

    if (!passwordsMatch) {
      setError(t('errors.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setError(t('errors.passwordTooShort'))
      return
    }

    submittedRef.current = true
    setLoading(true)

    try {
      await signUp(cleanEmail, password, cleanName, cleanFamilyName)
    } catch (err: any) {
      submittedRef.current = false
      setError(err.message || t('errors.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:items-center md:justify-center md:p-4">

      {/* Header - logo + title (always visible, adjusts sizing per breakpoint) */}
      <div className="pt-12 pb-2 px-7 text-center md:mb-8 md:pt-0 shrink-0">
        <Image
          src="/logo.png"
          alt="Florim"
          width={80}
          height={80}
          className="w-[52px] h-[52px] md:w-20 md:h-20 object-contain mx-auto mb-3"
        />
        <h1 className="font-serif text-[26px] md:text-4xl text-coffee mb-2">
          {t('heading')}
        </h1>
        <p className="text-ink/60 italic font-body text-[13px] md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Form - flat on mobile, card on desktop */}
      <div className="flex-1 md:flex-none w-full md:max-w-md md:bg-offWhite md:rounded-vintage md:border md:border-border md:shadow-vintage md:p-8 overflow-y-auto">
        <div className="px-7 pb-10 md:px-0 md:pb-0">
          {/* SSO */}
          {error && (
            <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          <SSOButtons onError={setError} disabled={loading} />
          <SSODivider />

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

            <div>
              <label htmlFor="email" className="block text-sm font-body text-ink mb-2">
                {t('emailLabel')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-body text-ink mb-2">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-body text-ink mb-2">
                {t('confirmPasswordLabel')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                {t('agreePrefix')}{' '}
                <Link href="/terms" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                  {t('termsLink')}
                </Link>{' '}
                {t('agreeMiddle')}{' '}
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
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-petrol hover:text-petrol/80 transition-vintage text-[13px] md:text-sm font-body"
            >
              {t('haveAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
