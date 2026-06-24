'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

type FamilyOption = {
  id: string
  name: string
  members: Array<{ name: string; email: string }>
}

export function FamilyPickerOverlay() {
  const { familyPickerVisible, familyId, switchFamily, hideFamilyPicker } = useAuth()
  const t = useTranslations()
  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyPickerVisible) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) { setError(t('familyPicker.invalidSession')); return }

        const res = await fetch('/api/admin/family-access', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) { setError(payload?.error || t('familyPicker.loadError')); return }
        setFamilies(payload.families ?? [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [familyPickerVisible])

  if (!familyPickerVisible) return null

  const handlePick = async (id: string) => {
    setSwitching(id)
    setError(null)
    try {
      await switchFamily(id)
      hideFamilyPicker()
    } catch (err: any) {
      setError(err?.message || t('familyPicker.switchError'))
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-bg border border-border rounded-vintage shadow-vintage overflow-hidden">
        <div className="px-6 py-5 border-b border-border bg-paper">
          <h2 className="text-xl font-serif text-coffee">{t('familyPicker.title')}</h2>
          <p className="text-sm text-ink/55 mt-1">{t('familyPicker.subtitle')}</p>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2 bg-terracotta/10 border border-terracotta/30 text-terracotta text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-ink/50">{t('familyPicker.loading')}</div>
          ) : families.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-ink/50">{t('familyPicker.empty')}</div>
          ) : (
            families.map((family) => {
              const isActive = family.id === familyId
              const isBusy = switching === family.id
              return (
                <button
                  type="button"
                  key={family.id}
                  onClick={() => handlePick(family.id)}
                  disabled={!!switching}
                  className={`w-full text-left px-6 py-4 border-b border-border last:border-b-0 hover:bg-paper transition-vintage disabled:opacity-60 ${isActive ? 'bg-coffee/5' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-coffee truncate">
                        {family.name}
                        {isActive && <span className="ml-2 text-[10px] text-coffee/50 font-mono">{t('familyPicker.current')}</span>}
                      </p>
                      <p className="text-xs text-ink/50 mt-0.5 truncate">
                        {family.members.map((m) => m.name).join(', ') || ''}
                      </p>
                    </div>
                    <span className="text-xs text-coffee/70 whitespace-nowrap">
                      {isBusy ? t('familyPicker.entering') : t('familyPicker.enter')}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-paper">
          <button
            type="button"
            onClick={hideFamilyPicker}
            disabled={!!switching}
            className="text-sm text-ink/50 hover:text-ink/80 transition-vintage disabled:opacity-40"
          >
            {t('familyPicker.useCurrentFamily')}
          </button>
        </div>
      </div>
    </div>
  )
}
