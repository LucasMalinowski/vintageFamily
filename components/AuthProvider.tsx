'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  familyId: string | null
  familyName: string | null
  familyCreatedAt: string | null
  trialEndsAt: Date | null
  isTrialExpired: boolean
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
  const [familyName, setFamilyName] = useState<string | null>(null)
  const [familyCreatedAt, setFamilyCreatedAt] = useState<string | null>(null)
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
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
        setFamilyName(null)
        setFamilyCreatedAt(null)
        setTrialEndsAt(null)
        setIsTrialExpired(false)
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

      if (data?.family_id) {
        setFamilyId(data.family_id)
        await loadFamilyData(data.family_id)
      }
    } catch (error) {
      console.error('Error in loadFamilyId:', error)
    }
  }

  const loadFamilyData = async (id: string) => {
    const { data, error } = await supabase
      .from('families')
      .select('name, created_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error loading family data:', error)
      return
    }

    if (data) {
      setFamilyName(data.name)
      setFamilyCreatedAt(data.created_at)
      const createdAt = new Date(data.created_at)
      const trialEnd = new Date(createdAt.getTime())
      trialEnd.setDate(trialEnd.getDate() + 7)
      setTrialEndsAt(trialEnd)
      setIsTrialExpired(new Date() > trialEnd)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    router.push('/')
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // 3. Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName })
        .select()
        .single()

      if (familyError) {
        console.error('Family creation error:', familyError)
        throw new Error('Erro ao criar família: ' + familyError.message)
      }

      // 4. Create user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          family_id: family.id,
          name,
          email,
          password_hash: 'managed_by_supabase_auth',
          role: 'admin',
        })

      if (userError) {
        console.error('User profile error:', userError)
        throw new Error('Erro ao criar perfil: ' + userError.message)
      }

      // 5. Create default categories
      await createDefaultCategories(family.id)

      // 6. Set family ID and redirect
      setFamilyId(family.id)
      setFamilyName(family.name)
      setFamilyCreatedAt(family.created_at)
      const trialEnd = new Date(family.created_at)
      trialEnd.setDate(trialEnd.getDate() + 7)
      setTrialEndsAt(trialEnd)
      setIsTrialExpired(new Date() > trialEnd)
      router.push('/')
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
      await loadFamilyData(payload.familyId)
      router.push('/')
    } catch (error: any) {
      console.error('AcceptInvite error:', error)
      throw error
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        familyId,
        familyName,
        familyCreatedAt,
        trialEndsAt,
        isTrialExpired,
        loading,
        signIn,
        signUp,
        acceptInvite,
        signOut,
      }}
    >
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

async function createDefaultCategories(familyId: string) {
  const categories = [
    // Expenses
    { family_id: familyId, kind: 'expense', name: 'Aluguel', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Energia', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Água', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Mercado', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Lazer', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Investimentos para casa', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Saúde', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Educação', is_system: true },
    { family_id: familyId, kind: 'expense', name: 'Hobbie', is_system: true },
    // Incomes
    { family_id: familyId, kind: 'income', name: 'Renda Familiar', is_system: true },
    { family_id: familyId, kind: 'income', name: 'Outras Receitas', is_system: true },
  ]

  await supabase.from('categories').insert(categories)

  // Create default dreams
  const dreams = [
    { family_id: familyId, name: 'Casa' },
    { family_id: familyId, name: 'Carro' },
    { family_id: familyId, name: 'Viagem' },
  ]

  await supabase.from('dreams').insert(dreams)
}
