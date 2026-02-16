'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadFamilyId(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadFamilyId(session.user.id)
      } else {
        setFamilyId(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadFamilyId = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error loading family_id:', error)
        return
      }

      if (data) {
        setFamilyId(data.family_id)
      }
    } catch (error) {
      console.error('Error in loadFamilyId:', error)
    }
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

      let session = signInData.session
      if (!session) {
        const { data: sessionData } = await supabase.auth.getSession()
        session = sessionData.session
      }

      if (!session) {
        throw new Error('Não foi possível autenticar o usuário.')
      }

      // Ensure the client is using the authenticated session before RLS writes
      await supabase.auth.setSession(session)

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
      console.error('SignUp error:', error)
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

      let session = authData.session
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
      console.error('AcceptInvite error:', error)
      throw error
    }
  }

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('sidebar-collapsed')
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
