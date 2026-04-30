'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getSidebarCollapsedStorageKey, LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  familyId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, familyName: string) => Promise<void>
  acceptInvite: (token: string, email: string, name: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setAccessTokenCookie(accessToken: string | null) {
  if (typeof window === 'undefined') return

  if (!accessToken) {
    document.cookie = 'app_access_token=; Path=/; Max-Age=0; SameSite=Lax'
    return
  }

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `app_access_token=${encodeURIComponent(accessToken)}; Path=/; Max-Age=2592000; SameSite=Lax${secureFlag}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active session with a 10s timeout to prevent infinite loading in PWA
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 10000)
    )

    Promise.race([sessionPromise, timeoutPromise])
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setAccessTokenCookie(session?.access_token ?? null)
        if (session?.user) {
          loadFamilyId(session.user.id)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAccessTokenCookie(session?.access_token ?? null)
      if (session?.user) {
        loadFamilyId(session.user.id)
      } else {
        setFamilyId(null)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadFamilyId = async (userId: string) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('family_id')
          .eq('id', userId)
          .maybeSingle()

        if (!error) {
          setFamilyId(data?.family_id ?? null)
          return
        }
      } catch {
        // network error — retry
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
    // All retries exhausted — sign out so the user isn't stuck on a blank loading screen
    await supabase.auth.signOut()
    router.push('/login')
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    router.push('/inicio')
  }

  const signUp = async (email: string, password: string, name: string, familyName: string) => {
    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // 2. Sign in immediately (bypass email confirmation)
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

      if (!session) {
        throw new Error('Não foi possível autenticar o usuário.')
      }

      // Ensure the client is using the authenticated session before RLS writes
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })

      // 3. Create family + profile + defaults on server (service role)
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
      if (!createdFamilyId) {
        throw new Error('Resposta inválida ao criar família.')
      }

      // 4. Set family ID and redirect
      setFamilyId(createdFamilyId)
      router.push('/inicio')
    } catch (error: any) {
      throw error
    }
  }

  const acceptInvite = async (token: string, email: string, name: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

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

      if (!session) {
        throw new Error('Não foi possível autenticar o usuário.')
      }

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
      router.push('/inicio')
    } catch (error: any) {
      throw error
    }
  }

  const signOut = async () => {
    setAccessTokenCookie(null)
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
    <AuthContext.Provider value={{ user, familyId, loading, signIn, signUp, acceptInvite, signOut }}>
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
