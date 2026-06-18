'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LogIn, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { getAuthBearerToken } from '@/lib/billing/client'
import { supabase } from '@/lib/supabase'

type FamilyRow = {
  id: string
  name: string
  lifetime_access: boolean
  founders_enabled: boolean
  trial_expires_at: string | null
  subscription_status: string | null
  members: Array<{ id: string; name: string; email: string }>
}

function addDaysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function dateInputToISO(date: string): string | null {
  if (!date) return null
  return date + 'T23:59:59.000Z'
}

function formatTrialExpiry(t: ReturnType<typeof useTranslations>, locale: string, iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const formatted = d.toLocaleDateString(locale)
  if (days < 0) return t('admin.trialExpiredOn', { date: formatted })
  if (days === 0) return t('admin.trialExpiresToday', { date: formatted })
  return t('admin.trialExpiresInDays', { date: formatted, days })
}

function StatusBadge({ family, t }: { family: FamilyRow; t: ReturnType<typeof useTranslations> }) {
  if (family.lifetime_access) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-olive/15 text-olive">
        {t('admin.statusPermanent')}
      </span>
    )
  }
  if (family.subscription_status && ['active', 'trialing'].includes(family.subscription_status)) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-petrol/15 text-petrol">
        {t('admin.statusPaid')}
      </span>
    )
  }
  if (family.trial_expires_at && new Date(family.trial_expires_at) > new Date()) {
    // eslint-disable-next-line react-hooks/purity
    const days = Math.ceil((new Date(family.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-gold/20 text-coffee">
        {t('admin.statusTrialDays', { days })}
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-ink/10 text-ink/55">
      {t('admin.statusFree')}
    </span>
  )
}

export default function SuperAdminSettingsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { user, familyId: activeFamilyId, switchFamily } = useAuth()
  const router = useRouter()
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [savingFamilyId, setSavingFamilyId] = useState<string | null>(null)
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null)
  const [switchingFamilyId, setSwitchingFamilyId] = useState<string | null>(null)
  const [trialInputs, setTrialInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      if (!user) return

      const { data: allowed } = await supabase.rpc('is_super_admin')
      setIsSuperAdmin(Boolean(allowed))
      setCheckingAdmin(false)

      if (!allowed) {
        router.replace('/settings/profile')
        return
      }

      const token = await getAuthBearerToken()
      if (!token) {
        setMessage(t('common.sessionExpired'))
        return
      }

      const response = await fetch('/api/admin/family-access', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(payload?.error || t('admin.errorLoadFamilies'))
        return
      }

      const loadedFamilies: FamilyRow[] = payload.families ?? []
      setFamilies(loadedFamilies)

      const inputs: Record<string, string> = {}
      for (const f of loadedFamilies) {
        inputs[f.id] = f.trial_expires_at ? f.trial_expires_at.slice(0, 10) : ''
      }
      setTrialInputs(inputs)
    }

    load()
  }, [router, user])

  const updateFamily = async (
    familyId: string,
    patch: { lifetime_access?: boolean; founders_enabled?: boolean; trial_expires_at?: string | null },
  ) => {
    setSavingFamilyId(familyId)
    setMessage(null)

    const token = await getAuthBearerToken()
    if (!token) {
      setMessage(t('common.sessionExpired'))
      setSavingFamilyId(null)
      return
    }

    const response = await fetch('/api/admin/family-access', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ family_id: familyId, ...patch }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(payload?.error || t('admin.errorUpdateFamily'))
      setSavingFamilyId(null)
      return
    }

    setFamilies((current) =>
      current.map((f) => (f.id === familyId ? { ...f, ...payload.family } : f)),
    )

    if ('trial_expires_at' in patch) {
      const newIso: string | null = payload.family?.trial_expires_at ?? null
      setTrialInputs((prev) => ({ ...prev, [familyId]: newIso ? newIso.slice(0, 10) : '' }))
    }

    setSavingFamilyId(null)
  }

  const enterFamily = async (familyId: string) => {
    setSwitchingFamilyId(familyId)
    setMessage(null)
    try {
      await switchFamily(familyId)
    } catch (err: any) {
      setMessage(err?.message || t('admin.errorEnterFamily'))
    } finally {
      setSwitchingFamilyId(null)
    }
  }

  const deleteFamily = async (family: FamilyRow) => {
    const confirmed = window.confirm(t('admin.confirmDeleteFamily', { name: family.name }))
    if (!confirmed) return

    setDeletingFamilyId(family.id)
    setMessage(null)

    const token = await getAuthBearerToken()
    if (!token) {
      setMessage(t('common.sessionExpired'))
      setDeletingFamilyId(null)
      return
    }

    const response = await fetch('/api/admin/family-access', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ family_id: family.id }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(payload?.error || t('admin.errorDeleteFamily'))
      setDeletingFamilyId(null)
      return
    }

    setFamilies((current) => current.filter((f) => f.id !== family.id))
    setTrialInputs((prev) => {
      const next = { ...prev }
      delete next[family.id]
      return next
    })
    setDeletingFamilyId(null)
  }

  if (checkingAdmin) {
    return (
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <p className="text-sm text-ink/60">{t('common.loading')}</p>
      </div>
    )
  }

  if (!isSuperAdmin) return null

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">{t('admin.superAdminTitle')}</h1>
        <p className="text-sm text-ink/60">
          {t('admin.superAdminSubtitle')}
        </p>
      </div>

      {message ? (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      ) : null}

      <div className="bg-bg border border-border rounded-vintage shadow-vintage overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-paper border-b border-border">
              <tr className="text-left text-ink/60">
                <th className="px-4 py-3 font-medium">{t('admin.colFamily')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.colMembers')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.colStatus')}</th>
                <th className="px-4 py-3 font-medium min-w-[260px]">{t('admin.colTrialUntil')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.colFounders')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.colPermanent')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('admin.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {families.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/50">
                    {t('admin.noFamiliesRegistered')}
                  </td>
                </tr>
              ) : null}
              {families.map((family) => {
                const isSaving = savingFamilyId === family.id
                const isDeleting = deletingFamilyId === family.id
                const isSwitching = switchingFamilyId === family.id
                const isBusy = isSaving || isDeleting || isSwitching
                const isActive = activeFamilyId === family.id
                const storedDateStr = family.trial_expires_at
                  ? family.trial_expires_at.slice(0, 10)
                  : ''
                const inputDateStr = trialInputs[family.id] ?? storedDateStr
                const isDirty = inputDateStr !== storedDateStr

                return (
                  <tr key={family.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-coffee">{family.name}</p>
                      <p className="text-[10px] text-ink/40 mt-0.5 font-mono break-all">{family.id}</p>
                    </td>

                    <td className="px-4 py-4">
                      {family.members.length === 0 ? (
                        <p className="text-xs text-ink/40">{t('admin.noMembers')}</p>
                      ) : (
                        <div className="space-y-1">
                          {family.members.map((member) => (
                            <p key={member.id} className="text-xs text-ink/70">
                              {member.name} · {member.email}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge family={family} t={t} />
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-xs text-ink/45 mb-2">
                        {formatTrialExpiry(t, locale, family.trial_expires_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={inputDateStr}
                          disabled={isBusy}
                          aria-label={t('admin.trialExpiryAria')}
                          onChange={(e) =>
                            setTrialInputs((prev) => ({ ...prev, [family.id]: e.target.value }))
                          }
                          className="px-2 py-1 text-xs border border-border rounded-lg bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-coffee/30 disabled:opacity-50"
                        />
                        {isDirty && (
                          <button
                            type="button"
                            onClick={() =>
                              updateFamily(family.id, {
                                trial_expires_at: dateInputToISO(inputDateStr),
                              })
                            }
                            disabled={isBusy}
                            className="px-2.5 py-1 text-xs bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSaving ? '...' : t('common.save')}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {[30, 60, 90, 180].map((n) => (
                          <button
                            type="button"
                            key={n}
                            disabled={isBusy}
                            onClick={() =>
                              setTrialInputs((prev) => ({
                                ...prev,
                                [family.id]: addDaysFromToday(n),
                              }))
                            }
                            className="px-1.5 py-0.5 text-[10px] border border-border rounded bg-paper text-ink/60 hover:bg-coffee/10 transition-vintage disabled:opacity-40"
                          >
                            +{n}d
                          </button>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={family.founders_enabled}
                          disabled={isBusy}
                          onChange={() =>
                            updateFamily(family.id, { founders_enabled: !family.founders_enabled })
                          }
                          className="accent-coffee"
                        />
                        <span className="text-sm text-ink/70">
                          {family.founders_enabled ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </label>
                    </td>

                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={family.lifetime_access}
                          disabled={isBusy}
                          onChange={() =>
                            updateFamily(family.id, { lifetime_access: !family.lifetime_access })
                          }
                          className="accent-coffee"
                        />
                        <span className="text-sm text-ink/70">
                          {family.lifetime_access ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </label>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          title={isActive ? t('admin.currentFamily') : t('admin.enterThisFamily')}
                          aria-label={t('admin.enterFamilyNamed', { name: family.name })}
                          disabled={isBusy || isActive}
                          onClick={() => enterFamily(family.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-coffee/30 text-coffee hover:bg-coffee/10 transition-vintage disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSwitching ? (
                            <span className="text-[10px]">...</span>
                          ) : (
                            <LogIn className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          title={t('admin.deleteFamilyTitle')}
                          aria-label={t('admin.deleteFamilyNamed', { name: family.name })}
                          disabled={isBusy}
                          onClick={() => deleteFamily(family)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-terracotta/30 text-terracotta hover:bg-terracotta/10 transition-vintage disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
