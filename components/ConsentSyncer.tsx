'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

function getLocalConsent(): boolean | null {
  if (typeof window === 'undefined') return null
  const val = localStorage.getItem('florim_cookie_consent')
  if (val === 'accepted') return true
  if (val === 'rejected') return false
  return null
}

async function saveToSupabase(userId: string, accepted: boolean) {
  await supabase.from('users').update({ analytics_consent: accepted }).eq('id', userId)
}

// Syncs web cookie consent to Supabase so mobile can read it.
// Runs when the user logs in (to push existing localStorage preference)
// and when the CookieBanner fires 'florim:consent-changed' (to push live changes).
export default function ConsentSyncer() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    const consent = getLocalConsent()
    if (consent === null) return
    void saveToSupabase(user.id, consent)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    function handleChange(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      void saveToSupabase(user!.id, detail === 'accepted')
    }
    window.addEventListener('florim:consent-changed', handleChange)
    return () => window.removeEventListener('florim:consent-changed', handleChange)
  }, [user?.id])

  return null
}
