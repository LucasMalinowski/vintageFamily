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
  members: Array<{
    id: string
    name: string
    email: string
  }>
}

export default function SuperAdminSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [families, setFamilies] = useState<FamilyRow[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [savingFamilyId, setSavingFamilyId] = useState<string | null>(null)

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
        setMessage('Sessao invalida. Faca login novamente.')
        return
      }

      const response = await fetch('/api/admin/family-access', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(payload?.error || 'Falha ao carregar familias.')
        return
      }

      setFamilies(payload.families ?? [])
    }

    load()
  }, [router, user])

  const updateFamily = async (
    familyId: string,
    patch: { lifetime_access?: boolean; founders_enabled?: boolean },
  ) => {
    setSavingFamilyId(familyId)
    setMessage(null)

    const token = await getAuthBearerToken()
    if (!token) {
      setMessage('Sessao invalida. Faca login novamente.')
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
      setMessage(payload?.error || 'Falha ao atualizar familia.')
      setSavingFamilyId(null)
      return
    }

    setFamilies((current) =>
      current.map((family) => (family.id === familyId ? { ...family, ...payload.family } : family)),
    )
    setSavingFamilyId(null)
  }

  if (checkingAdmin) {
    return (
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <p className="text-sm text-ink/60">Carregando...</p>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">Superadministrador</h1>
        <p className="text-sm text-ink/60">Controle acesso vitalício e elegibilidade de fundadores por família.</p>
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
                <th className="px-4 py-3 font-medium">Fundadores</th>
                <th className="px-4 py-3 font-medium">Permanente</th>
              </tr>
            </thead>
            <tbody>
              {families.map((family) => {
                const isSaving = savingFamilyId === family.id

                return (
                  <tr key={family.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-coffee">{family.name}</p>
                      <p className="text-xs text-ink/50">{family.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {family.members.length === 0 ? (
                          <p className="text-xs text-ink/50">Sem membros</p>
                        ) : (
                          family.members.map((member) => (
                            <p key={member.id} className="text-xs text-ink/70">
                              {member.name} - {member.email}
                            </p>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 text-ink/80">
                        <input
                          type="checkbox"
                          checked={family.founders_enabled}
                          disabled={isSaving}
                          onChange={() =>
                            updateFamily(family.id, { founders_enabled: !family.founders_enabled })
                          }
                        />
                          <span>{family.founders_enabled ? 'Ativo' : 'Inativo'}</span>
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <label className="inline-flex items-center gap-2 text-ink/80">
                        <input
                          type="checkbox"
                          checked={family.lifetime_access}
                          disabled={isSaving}
                          onChange={() =>
                            updateFamily(family.id, { lifetime_access: !family.lifetime_access })
                          }
                        />
                          <span>{family.lifetime_access ? 'Ativo' : 'Inativo'}</span>
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
