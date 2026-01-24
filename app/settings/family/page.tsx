'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

type InviteRow = {
  id: string
  email: string
  created_at: string
  expires_at: string
  accepted: boolean
}

export default function FamilySettingsPage() {
  const { familyId } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingFamily, setSavingFamily] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFamily = async () => {
      if (!familyId) return
      setLoading(true)
      setError(null)

      const [{ data: familyRow, error: familyError }, { data: inviteRows, error: inviteError }] =
        await Promise.all([
          supabase.from('families').select('name').eq('id', familyId).maybeSingle(),
          supabase
            .from('invites')
            .select('id,email,created_at,expires_at,accepted')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false }),
        ])

      if (familyError || inviteError) {
        setError('Erro ao carregar dados da família.')
      }

      if (familyRow) {
        setFamilyName(familyRow.name ?? '')
      }

      setInvites(inviteRows ?? [])
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

    const { data: inviteRows } = await supabase
      .from('invites')
      .select('id,email,created_at,expires_at,accepted')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })

    setInvites(inviteRows ?? [])
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
                <div className="grid grid-cols-3 gap-4 bg-paper px-4 py-2 text-xs uppercase tracking-wide text-ink/60 font-body">
                  <span>Email</span>
                  <span>Status</span>
                  <span>Expira</span>
                </div>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="grid grid-cols-3 gap-4 px-4 py-2 text-sm font-body border-t border-border"
                  >
                    <span className="text-ink">{invite.email}</span>
                    <span className="text-ink/70">
                      {invite.accepted ? 'Aceito' : 'Pendente'}
                    </span>
                    <span className="text-ink/70">
                      {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                    </span>
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
