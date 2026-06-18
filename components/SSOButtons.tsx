'use client'

/**
 * SSOButtons — self-contained Google + Apple sign-in buttons.
 *
 * Google uses the raw GIS (Google Identity Services) code-client popup flow:
 *   1. GIS script is loaded globally in layout.tsx (afterInteractive)
 *   2. useEffect polls until window.google.accounts.oauth2 is ready, then
 *      initialises the code client once and stores it in a ref.
 *   3. User clicks → requestCode() opens the popup synchronously (same tick)
 *   4. Popup closes → callback receives auth code
 *   5. We POST the code to /api/auth/google-token (server exchanges for ID token)
 *   6. signInWithGoogle(idToken) → supabase.auth.signInWithIdToken
 *   → florim.app shown on Google consent screen, never Supabase's URL
 *
 * Apple uses Supabase's OAuth redirect flow (Apple requires it for web).
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/components/AuthProvider'

interface SSOButtonsProps {
  /** Called when any SSO flow errors — lets the parent page surface the message. */
  onError?: (message: string) => void
  /** Disables both buttons (e.g. while the email form is submitting). */
  disabled?: boolean
}

export function SSODivider() {
  const t = useTranslations()
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[13px] text-ink/40 font-body shrink-0">{t('ssoButtons.orContinueWith')}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

export function SSOButtons({ onError, disabled = false }: SSOButtonsProps) {
  const t = useTranslations()
  const { signInWithGoogle, signInWithApple } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const codeClientRef = useRef<any>(null)

  // Initialise the GIS code client as soon as the script is ready.
  // The GIS script is loaded in layout.tsx with strategy="afterInteractive".
  // We poll every 200 ms so the ref is populated before the first click.
	  useEffect(() => {
	    let mounted = true
	    let retryTimeout: ReturnType<typeof setTimeout> | null = null

	    const tryInit = () => {
	      if (!mounted) return

      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: async (response: { code?: string; error?: string }) => {
            if (response.error || !response.code) {
              onError?.(t('ssoButtons.errors.google'))
              setGoogleLoading(false)
              return
            }

            setGoogleLoading(true)
            try {
              const res = await fetch('/api/auth/google-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: response.code }),
              })
              if (!res.ok) {
                const payload = await res.json().catch(() => ({}))
                throw new Error(payload?.error ?? t('ssoButtons.errors.googleAuthFailed'))
              }
              const { idToken } = await res.json()
              await signInWithGoogle(idToken)
            } catch (err: any) {
              onError?.(err.message ?? t('ssoButtons.errors.google'))
              setGoogleLoading(false)
            }
          },
        })
        return
      }

	      // Script not ready yet — retry shortly
	      retryTimeout = setTimeout(tryInit, 200)
	    }

	    tryInit()
	    return () => {
	      mounted = false
	      if (retryTimeout) {
	        clearTimeout(retryTimeout)
	      }
	    }
	  }, [signInWithGoogle, onError])

  const handleGoogleClick = () => {
    if (!codeClientRef.current) {
      onError?.(t('ssoButtons.errors.googleNotReady'))
      return
    }
    codeClientRef.current.requestCode()
  }

  const handleApple = async () => {
    setAppleLoading(true)
    try {
      await signInWithApple()
      // signInWithApple triggers a redirect — page unmounts, no finally needed
    } catch (err: any) {
      onError?.(err.message ?? t('ssoButtons.errors.apple'))
      setAppleLoading(false)
    }
  }

  const isDisabled = disabled || googleLoading || appleLoading

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isDisabled}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-offWhite border border-border rounded-full text-[15px] font-body font-medium text-ink hover:bg-border/40 transition-vintage disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googleLoading ? <LoadingSpinner /> : <><GoogleIcon /> {t('ssoButtons.continueWithGoogle')}</>}
      </button>

      {/* Apple */}
      <button
        type="button"
        onClick={handleApple}
        disabled={isDisabled}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-zinc-950 text-white rounded-full text-[15px] font-body font-medium hover:opacity-90 transition-vintage disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {appleLoading ? <LoadingSpinner color="white" /> : <><AppleIcon /> {t('ssoButtons.continueWithApple')}</>}
      </button>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
      <path d="M13.173 10.5985C13.1565 8.4585 14.9065 7.4185 14.9865 7.3685C13.9865 5.8985 12.4365 5.6985 11.8965 5.6785C10.5765 5.5385 9.30647 6.4585 8.63647 6.4585C7.95647 6.4585 6.91647 5.6985 5.79647 5.7185C4.35647 5.7385 3.01647 6.5585 2.27647 7.8585C0.736469 10.5185 1.89647 14.4785 3.37647 16.6585C4.11647 17.7385 4.97647 18.9585 6.11647 18.9185C7.21647 18.8785 7.63647 18.2185 8.97647 18.2185C10.3065 18.2185 10.6965 18.9185 11.8565 18.8985C13.0465 18.8785 13.7965 17.7785 14.5165 16.6885C15.3765 15.4285 15.7165 14.1985 15.7365 14.1385C15.7065 14.1285 13.1965 13.1185 13.173 10.5985Z" fill="white"/>
      <path d="M10.9965 4.1785C11.5965 3.4185 12.0165 2.3785 11.8965 1.3185C10.9965 1.3585 9.87647 1.9385 9.25647 2.6785C8.69647 3.3385 8.19647 4.4185 8.33647 5.4385C9.35647 5.5185 10.3965 4.9385 10.9965 4.1785Z" fill="white"/>
    </svg>
  )
}

function LoadingSpinner({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke={color} strokeWidth="4" />
      <path className="opacity-75" fill={color} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
