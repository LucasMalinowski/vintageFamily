'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSidebarCollapsedStorageKey, LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { useRouter } from 'next/navigation'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

interface AuthContextType {
  user: User | null
  familyId: string | null
  loading: boolean
  authStatus: AuthStatus
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, familyName: string) => Promise<void>
  acceptInvite: (token: string, email: string, name: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function syncServerSession(session: Pick<Session, 'access_token' | 'refresh_token'>) {
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
    throw new Error(payload?.error || 'Não foi possível sincronizar a sessão.')
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const router = useRouter()
  const mountedRef = useRef(true)
  const familyLoadInProgressRef = useRef<string | null>(null)
  const userRef = useRef<User | null>(null)
  const familyIdRef = useRef<string | null>(null)

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
        const { data, error } = await supabase
          .from('users')
          .select('family_id')
          .eq('id', userId)
          .maybeSingle()

        if (!mountedRef.current) return

        if (!error) {
          if (familyLoadInProgressRef.current === userId) {
            setFamilyId(data?.family_id ?? null)
            familyLoadInProgressRef.current = null
          }
          return
        }
      } catch {
        // network error — retry
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }

    // All retries exhausted — do NOT sign out; user stays authenticated
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthProvider] familyId lookup failed after retries; keeping user session')
    }
    if (mountedRef.current) familyLoadInProgressRef.current = null
  }, [])

  const applyAuthenticatedSession = useCallback(async (session: Session) => {
    setUser(session.user)

    try {
      await syncServerSession(session)
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
      if (!mountedRef.current) return

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
      // Other events without a session (e.g. TOKEN_REFRESHED failure) are ignored —
      // Supabase will emit SIGNED_OUT if the session is truly gone
    })

    // Initial session check — no timeout, no false logout on slow networks
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!mountedRef.current) return
        if (session?.user) {
          await applyAuthenticatedSession(session)
        } else {
          // PWA cold-start: localStorage may be empty but cookies (set by SSR middleware)
          // may still hold a valid refresh token — attempt one silent refresh before logout.
          try {
            const { data: refreshData } = await supabase.auth.refreshSession()
            if (!mountedRef.current) return
            if (refreshData.session?.user) {
              await applyAuthenticatedSession(refreshData.session)
              return
            }
          } catch {
            // refresh failed — fall through to unauthenticated
          }
          if (!mountedRef.current) return
          setUser(null)
          setAuthStatus('unauthenticated')
        }
      })
      .catch(() => {
        if (!mountedRef.current) return
        // Transient error — do not clear user or cookies; show error state
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    let session: Session | null = data.session
    if (!session) {
      const { data: sessionData } = await supabase.auth.getSession()
      session = sessionData.session
    }
    if (!session) throw new Error('Não foi possível autenticar o usuário.')

    await syncServerSession(session)
    setUser(session.user)
    setAuthStatus('authenticated')
    router.replace('/inicio')
  }

  const signUp = async (email: string, password: string, name: string, familyName: string) => {
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
      if (!session) throw new Error('Não foi possível autenticar o usuário.')

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      await syncServerSession(session)

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
        throw new Error(payload?.error || 'Erro ao criar família.')
      }

      const payload = await response.json()
      const createdFamilyId = payload.familyId as string | undefined
      if (!createdFamilyId) throw new Error('Resposta inválida ao criar família.')

      setFamilyId(createdFamilyId)
      setUser(session.user)
      setAuthStatus('authenticated')
      posthog.capture(EVENTS.SIGNUP_COMPLETED, { family_id: createdFamilyId })
      router.replace('/inicio')
    } catch (error: any) {
      throw error
    }
  }

  const acceptInvite = async (token: string, email: string, name: string, password: string) => {
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
      if (!session) throw new Error('Não foi possível autenticar o usuário.')
      await syncServerSession(session)

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
        throw new Error(payload?.error || 'Erro ao aceitar convite.')
      }

      const payload = await response.json()
      setFamilyId(payload.familyId)
      setUser(session.user)
      setAuthStatus('authenticated')
      posthog.capture(EVENTS.INVITE_ACCEPTED, { family_id: payload.familyId })
      router.replace('/inicio')
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      if (user?.id) {
        window.localStorage.removeItem(getSidebarCollapsedStorageKey(user.id))
      }
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.sidebarCollapsed)
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
      delete document.documentElement.dataset.sidebarCollapsed
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, familyId, loading, authStatus, signIn, signUp, acceptInvite, signOut }}>
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
