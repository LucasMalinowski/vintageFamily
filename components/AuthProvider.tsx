'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSidebarCollapsedStorageKey, LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { useRouter } from 'next/navigation'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import { useTranslations } from 'next-intl'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

interface AuthContextType {
  user: User | null
  familyId: string | null
  loading: boolean
  authStatus: AuthStatus
  isSuperAdmin: boolean
  familyPickerVisible: boolean
  switchFamily: (newFamilyId: string) => Promise<void>
  hideFamilyPicker: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, familyName: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<void>
  signInWithApple: () => Promise<void>
  acceptInvite: (token: string, email: string, name: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function syncServerSession(session: Pick<Session, 'access_token' | 'refresh_token'>, errorMsg?: string) {
  const response = await fetch('/api/auth/sync-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.error || errorMsg || 'Não foi possível sincronizar a sessão.')
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [familyPickerVisible, setFamilyPickerVisible] = useState(false)
  const familyPickerDismissedRef = useRef(false)
  const router = useRouter()
  const mountedRef = useRef(true)
  const familyLoadInProgressRef = useRef<string | null>(null)
  const userRef = useRef<User | null>(null)
  const familyIdRef = useRef<string | null>(null)
  // Prevents onAuthStateChange from running applyAuthenticatedSession while signIn/signUp
  // is already managing the flow — avoids duplicate syncServerSession calls and state flicker.
  const authInProgressRef = useRef(false)

  // Keep refs in sync so event listeners read current values without stale closures
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { familyIdRef.current = familyId }, [familyId])

  // loading is true only during the initial session resolution
  const loading = authStatus === 'loading'

  const loadFamilyId = useCallback(async (userId: string) => {
    // Prevent concurrent loads for the same user
    if (familyLoadInProgressRef.current === userId) return
    familyLoadInProgressRef.current = userId

    for (let attempt = 0; attempt < 3; attempt++) {
      if (!mountedRef.current) return
      try {
        const [{ data, error }, { data: isAdmin }] = await Promise.all([
          supabase.from('users').select('family_id').eq('id', userId).maybeSingle(),
          supabase.rpc('is_super_admin'),
        ])

        if (!mountedRef.current) return

        if (!error) {
          if (familyLoadInProgressRef.current === userId) {
            setFamilyId(data?.family_id ?? null)
            const admin = Boolean(isAdmin)
            setIsSuperAdmin(admin)
            if (admin && !familyPickerDismissedRef.current) {
              setFamilyPickerVisible(true)
            }
            familyLoadInProgressRef.current = null
          }
          return
        }
      } catch {
        // network error - retry
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }

    // All retries exhausted - do NOT sign out; user stays authenticated
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthProvider] familyId lookup failed after retries; keeping user session')
    }
    if (mountedRef.current) familyLoadInProgressRef.current = null
  }, [])

  const applyAuthenticatedSession = useCallback(async (session: Session) => {
    setUser(session.user)

    try {
      await syncServerSession(session, t('auth.syncError'))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthProvider] server session sync failed', error)
      }
      if (mountedRef.current) setAuthStatus('error')
      return
    }

    if (!mountedRef.current) return
    setAuthStatus('authenticated')
    loadFamilyId(session.user.id)
  }, [loadFamilyId])

  useEffect(() => {
    mountedRef.current = true

    // Register listener before getSession so we never miss an event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current || authInProgressRef.current) return

      if (session?.user) {
        void applyAuthenticatedSession(session)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setFamilyId(null)
        setAuthStatus('unauthenticated')
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
        }
      }
      // Other events without a session (e.g. TOKEN_REFRESHED failure) are ignored -
      // Supabase will emit SIGNED_OUT if the session is truly gone
    })

    // Initial session check - no timeout, no false logout on slow networks
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mountedRef.current) return
        if (session?.user) {
          await applyAuthenticatedSession(session)
        } else {
          // PWA cold-start: localStorage may be empty but cookies (set by SSR middleware)
          // may still hold a valid refresh token - attempt one silent refresh before logout.
          try {
            const { data: refreshData } = await supabase.auth.refreshSession()
            if (!mountedRef.current) return
            if (refreshData.session?.user) {
              await applyAuthenticatedSession(refreshData.session)
              return
            }
          } catch {
            // refresh failed - fall through to unauthenticated
          }
          if (!mountedRef.current) return
          setUser(null)
          setAuthStatus('unauthenticated')
        }
      })
      .catch(() => {
        if (!mountedRef.current) return
        // Transient error - do not clear user or cookies; show error state
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthProvider] getSession failed; preserving existing auth state')
        }
        setAuthStatus((prev) => (prev === 'loading' ? 'error' : prev))
      })

    // On visibility restore, retry familyId if user is authenticated but familyId is missing
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userRef.current && !familyIdRef.current) {
        loadFamilyId(userRef.current.id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [applyAuthenticatedSession, loadFamilyId])

  const signIn = async (email: string, password: string) => {
    authInProgressRef.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      let session: Session | null = data.session
      if (!session) {
        const { data: sessionData } = await supabase.auth.getSession()
        session = sessionData.session
      }
      if (!session) throw new Error(t('auth.authError'))

      await syncServerSession(session, t('auth.syncError'))
      setUser(session.user)
      setAuthStatus('authenticated')
      router.replace('/inicio')
    } finally {
      authInProgressRef.current = false
    }
  }

  const signUp = async (email: string, password: string, name: string, familyName: string) => {
    authInProgressRef.current = true
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError

      let session: typeof signInData.session | null = signInData.session ?? null
      if (!session) {
        const { data: sessionData } = await supabase.auth.getSession()
        session = sessionData.session
      }
      if (!session) throw new Error(t('auth.authError'))

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      await syncServerSession(session, t('auth.syncError'))

      const response = await fetch('/api/families/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ familyName, name, email }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || t('auth.createFamilyError'))
      }

      const payload = await response.json()
      const createdFamilyId = payload.familyId as string | undefined
      if (!createdFamilyId) throw new Error(t('auth.invalidFamilyResponse'))

      setFamilyId(createdFamilyId)
      setUser(session.user)
      setAuthStatus('authenticated')
      posthog.capture(EVENTS.SIGNUP_COMPLETED, { family_id: createdFamilyId })
      router.replace('/inicio')
    } catch (error: any) {
      throw error
    } finally {
      authInProgressRef.current = false
    }
  }

  const signInWithGoogle = async (idToken: string) => {
    authInProgressRef.current = true
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (error) throw error
      if (!data.session) throw new Error(t('auth.googleAuthError'))

      await syncServerSession(data.session)
      setUser(data.session.user)
      setAuthStatus('authenticated')

      // Detect new user (no family yet) → SSO onboarding
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', data.session.user.id)
        .maybeSingle()

      router.replace(userData?.family_id ? '/inicio' : '/signup/sso-complete')
    } finally {
      authInProgressRef.current = false
    }
  }

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const acceptInvite = async (token: string, email: string, name: string, password: string) => {
    authInProgressRef.current = true
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError

      let session: typeof authData.session | null = authData.session ?? null
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        session = signInData.session
      }
      if (!session) throw new Error(t('auth.authError'))
      await syncServerSession(session, t('auth.syncError'))

      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token, name, email }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || t('auth.acceptInviteError'))
      }

      const payload = await response.json()
      setFamilyId(payload.familyId)
      setUser(session.user)
      setAuthStatus('authenticated')
      posthog.capture(EVENTS.INVITE_ACCEPTED, { family_id: payload.familyId })
      router.replace('/inicio')
    } catch (error: any) {
      throw error
    } finally {
      authInProgressRef.current = false
    }
  }

  const switchFamily = async (newFamilyId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error(t('auth.invalidSession'))

    const res = await fetch('/api/admin/switch-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ family_id: newFamilyId }),
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload?.error || t('auth.switchFamilyError'))
    }
    setFamilyId(newFamilyId)
  }

  const hideFamilyPicker = () => {
    familyPickerDismissedRef.current = true
    setFamilyPickerVisible(false)
  }

  const signOut = async () => {
    familyPickerDismissedRef.current = false
    if (typeof window !== 'undefined') {
      if (user?.id) {
        window.localStorage.removeItem(getSidebarCollapsedStorageKey(user.id))
      }
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.sidebarCollapsed)
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
      delete document.documentElement.dataset.sidebarCollapsed
    }
    await supabase.auth.signOut()
    setIsSuperAdmin(false)
    setFamilyPickerVisible(false)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, familyId, loading, authStatus, isSuperAdmin, familyPickerVisible, switchFamily, hideFamilyPicker, signIn, signUp, signInWithGoogle, signInWithApple, acceptInvite, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
