'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { formatDate } from '@/lib/dates'
import { X } from 'lucide-react'

type InviteRow = {
  id: string
  email: string
  created_at: string
  expires_at: string
  accepted: boolean
}

type MemberRow = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string
}

export default function FamilySettingsPage() {
  const { familyId, user } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFamily, setSavingFamily] = useState(false)
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null)
  const [savingInviteId, setSavingInviteId] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFamily = async () => {
      if (!familyId) return
      setLoading(true)
      setError(null)

      const [
        { data: familyRow, error: familyError },
        { data: inviteRows, error: inviteError },
        { data: memberRows, error: memberError },
      ] = await Promise.all([
        supabase.from('families').select('name').eq('id', familyId).maybeSingle(),
        supabase
          .from('invites')
          .select('id,email,created_at,expires_at,accepted')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id,name,email,avatar_url,role')
          .eq('family_id', familyId)
          .order('name'),
      ])

      if (familyError || inviteError || memberError) {
        setError('Erro ao carregar dados da família.')
      }

      if (familyRow) {
        setFamilyName(familyRow.name ?? '')
      }

      setInvites(inviteRows ?? [])
      setMembers(memberRows ?? [])
      setLoading(false)
    }

    loadFamily()
  }, [familyId])

  const handleSaveFamily = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!familyId) return
    setSavingFamily(true)
    setInviteStatus(null)
    setError(null)

    const { error: updateError } = await supabase
      .from('families')
      .update({ name: familyName.trim() })
      .eq('id', familyId)

    if (updateError) {
      setError('Erro ao salvar família.')
    }

    setSavingFamily(false)
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviteStatus(null)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError('Você precisa estar logado para convidar.')
      return
    }

    const response = await fetch('/api/invites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload?.error || 'Erro ao enviar convite.')
      return
    }

    setInviteEmail('')
    setInviteStatus('Convite enviado com sucesso.')

    if (familyId) {
      const { data: inviteRows } = await supabase
        .from('invites')
        .select('id,email,created_at,expires_at,accepted')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })

      setInvites(inviteRows ?? [])
    }
  }

  const handleUpdateMemberRole = async (memberId: string, role: string) => {
    setSavingMemberId(memberId)
    setError(null)

    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', memberId)

    if (updateError) {
      setError('Erro ao atualizar o papel do membro.')
    } else {
      setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, role } : member)))
    }

    setSavingMemberId(null)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Remover este membro da família?')) return
    setSavingMemberId(memberId)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError('Você precisa estar logado para remover.')
      setSavingMemberId(null)
      return
    }

    const response = await fetch('/api/members/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ memberId }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload?.error || 'Erro ao remover o membro.')
    } else {
      setMembers((prev) => prev.filter((member) => member.id !== memberId))
    }

    setSavingMemberId(null)
  }

  const handleCancelInvite = async (inviteId: string) => {
    setSavingInviteId(inviteId)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError('Você precisa estar logado para cancelar.')
      setSavingInviteId(null)
      return
    }

    const response = await fetch('/api/invites/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ inviteId }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setError(payload?.error || 'Erro ao cancelar convite.')
    } else {
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
    }

    setSavingInviteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">Família</h1>
        <p className="text-sm text-ink/60 font-body">
          Gerencie o nome da família e os convites enviados.
        </p>
      </div>

      {error && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6">
          <p className="text-sm text-ink/60 font-body">Carregando...</p>
        </div>
      ) : (
        <>
          <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6">
            <form onSubmit={handleSaveFamily} className="space-y-4">
              <h2 className="text-lg font-serif text-coffee">Nome da família</h2>
              <div>
                <label className="block text-sm font-body text-ink mb-2">Nome</label>
                <input
                  value={familyName}
                  onChange={(event) => setFamilyName(event.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 transition-vintage"
                  placeholder="Família"
                />
              </div>
              <button
                type="submit"
                disabled={savingFamily}
                className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
              >
                {savingFamily ? 'Salvando...' : 'Salvar família'}
              </button>
            </form>
          </div>

          <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-coffee">Membros</h2>
              <p className="text-sm text-ink/60 font-body">
                Veja quem faz parte da família e ajuste permissões.
              </p>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-ink/60 font-body">Nenhum membro encontrado.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isCurrentUser = user?.id === member.id
                  return (
                    <div
                      key={member.id}
                      className="flex flex-col md:flex-row md:items-center gap-4 border border-border rounded-lg bg-paper px-4 py-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-coffee/20 flex items-center justify-center overflow-hidden">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-coffee text-lg font-serif">
                              {member.name ? member.name.slice(0, 1).toUpperCase() : 'M'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-body text-ink">{member.name}</p>
                            {isCurrentUser && (
                              <span className="text-[11px] uppercase tracking-wide text-ink/50 border border-border px-2 py-0.5 rounded-full">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/60">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(event) => handleUpdateMemberRole(member.id, event.target.value)}
                          disabled={savingMemberId === member.id}
                          className="px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-petrol/50 disabled:opacity-60"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Membro</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                          disabled={savingMemberId === member.id || isCurrentUser}
                          className="text-terracotta/70 hover:text-terracotta transition-vintage disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={`Remover ${member.name}`}
                          title={`Remover ${member.name}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-coffee">Convites</h2>
              <p className="text-sm text-ink/60 font-body">
                Envie um convite por email para trazer novos membros.
              </p>
            </div>
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                className="flex-1 px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 transition-vintage"
                placeholder="email@exemplo.com"
              />
              <button
                type="submit"
                className="bg-petrol text-paper px-4 py-3 rounded-lg font-body hover:bg-petrol/90 transition-vintage"
              >
                Enviar convite
              </button>
            </form>
            {inviteStatus && (
              <div className="bg-petrol/10 border border-petrol/30 text-petrol px-4 py-3 rounded-lg text-sm">
                {inviteStatus}
              </div>
            )}
            {invites.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-4 bg-paper px-4 py-2 text-xs uppercase tracking-wide text-ink/60 font-body">
                  <span>Email</span>
                  <span>Status</span>
                  <span>Expiração</span>
                  <span>Ações</span>
                </div>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="grid grid-cols-4 gap-4 px-4 py-3 text-sm font-body border-t border-border items-center"
                  >
                    <span className="text-ink">{invite.email}</span>
                    <span className="text-ink/70">
                      {invite.accepted ? 'Aceito' : 'Pendente'}
                    </span>
                    <span className="text-ink/70">
                      {formatDate(invite.expires_at)}
                    </span>
                    <div className="flex items-center gap-3">
                      {!invite.accepted && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={savingInviteId === invite.id}
                          className="text-sm text-terracotta hover:text-terracotta/80 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
