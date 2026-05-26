/**
 * googleAuth.ts — Popup-based Google Sign-In for the web app.
 *
 * Uses Google Identity Services (GIS) via @react-oauth/google so the entire
 * auth flow stays on florim.app. The Supabase URL is never shown to the user.
 *
 * Flow: user clicks button → Google popup → user picks account →
 *       popup closes → we receive an ID token → pass to supabase.auth.signInWithIdToken
 */

import { googleLogout, hasGrantedAllScopesGoogle } from '@react-oauth/google'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
          cancel: () => void
          revoke: (hint: string, callback: () => void) => void
        }
        oauth2: {
          initTokenClient: (config: object) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

/** Open the Google sign-in popup and resolve with an ID token string. */
export function googleSignInPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    // @react-oauth/google loads the GIS script automatically via GoogleOAuthProvider.
    // We tap into it via the global google object it exposes.
    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      reject(new Error('Google Identity Services não carregou. Tente novamente.'))
      return
    }

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: (response: { credential?: string; error?: string }) => {
        if (response.credential) {
          resolve(response.credential)
        } else {
          reject(new Error(response.error || 'Login com Google cancelado.'))
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap was suppressed (e.g. user dismissed it too many times).
        // Fall back to a full redirect flow via Supabase.
        reject(new Error('__USE_REDIRECT__'))
      }
    })
  })
}

export { googleLogout }
