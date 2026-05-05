'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

function formatTrialExpiry(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const formatted = d.toLocaleDateString('pt-BR')
  if (days < 0) return `${formatted} (expirado)`
  if (days === 0) return `${formatted} (hoje)`
  return `${formatted} (+${days}d)`
}

function StatusBadge({ family }: { family: FamilyRow }) {
  if (family.lifetime_access) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-olive/15 text-olive">
        Permanente
      </span>
    )
  }
  if (family.subscription_status && ['active', 'trialing'].includes(family.subscription_status)) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-petrol/15 text-petrol">
        Pago
      </span>
    )
  }
  if (family.trial_expires_at && new Date(family.trial_expires_at) > new Date()) {
    const days = Math.ceil((new Date(family.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-gold/20 text-coffee">
        Teste ({days}d)
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-ink/10 text-ink/55">
      Gratuito
    </span>
  )
}

export default function SuperAdminSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [savingFamilyId, setSavingFamilyId] = useState<string | null>(null)
  const [trialInputs, setTrialInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('super_admin')
        .eq('id', user.id)
        .maybeSingle()

      const allowed = Boolean(profile?.super_admin)
      setIsSuperAdmin(allowed)
      setCheckingAdmin(false)

      if (!allowed) {
        router.replace('/settings/profile')
        return
      }

      const token = await getAuthBearerToken()
      if (!token) {
        setMessage('Sessão inválida. Faça login novamente.')
        return
      }

      const response = await fetch('/api/admin/family-access', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(payload?.error || 'Falha ao carregar famílias.')
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
      setMessage('Sessão inválida. Faça login novamente.')
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
      setMessage(payload?.error || 'Falha ao atualizar família.')
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

  if (checkingAdmin) {
    return (
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <p className="text-sm text-ink/60">Carregando...</p>
      </div>
    )
  }

  if (!isSuperAdmin) return null

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">Superadministrador</h1>
        <p className="text-sm text-ink/60">
          Controle acesso, período de teste e elegibilidade por família.
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
                <th className="px-4 py-3 font-medium">Família</th>
                <th className="px-4 py-3 font-medium">Membros</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium min-w-[260px]">Trial até</th>
                <th className="px-4 py-3 font-medium">Fundadores</th>
                <th className="px-4 py-3 font-medium">Permanente</th>
              </tr>
            </thead>
            <tbody>
              {families.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/50">
                    Nenhuma família cadastrada.
                  </td>
                </tr>
              ) : null}
              {families.map((family) => {
                const isSaving = savingFamilyId === family.id
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
                        <p className="text-xs text-ink/40">Sem membros</p>
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
                      <StatusBadge family={family} />
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-xs text-ink/45 mb-2">
                        {formatTrialExpiry(family.trial_expires_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={inputDateStr}
                          disabled={isSaving}
                          onChange={(e) =>
                            setTrialInputs((prev) => ({ ...prev, [family.id]: e.target.value }))
                          }
                          className="px-2 py-1 text-xs border border-border rounded-lg bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-coffee/30 disabled:opacity-50"
                        />
                        {isDirty && (
                          <button
                            onClick={() =>
                              updateFamily(family.id, {
                                trial_expires_at: dateInputToISO(inputDateStr),
                              })
                            }
                            disabled={isSaving}
                            className="px-2.5 py-1 text-xs bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSaving ? '...' : 'Salvar'}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {[30, 60, 90, 180].map((n) => (
                          <button
                            key={n}
                            disabled={isSaving}
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
                          disabled={isSaving}
                          onChange={() =>
                            updateFamily(family.id, { founders_enabled: !family.founders_enabled })
                          }
                          className="accent-coffee"
                        />
                        <span className="text-sm text-ink/70">
                          {family.founders_enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </label>
                    </td>

                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={family.lifetime_access}
                          disabled={isSaving}
                          onChange={() =>
                            updateFamily(family.id, { lifetime_access: !family.lifetime_access })
                          }
                          className="accent-coffee"
                        />
                        <span className="text-sm text-ink/70">
                          {family.lifetime_access ? 'Ativo' : 'Inativo'}
                        </span>
                      </label>
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
