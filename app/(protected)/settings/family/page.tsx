'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { formatDate } from '@/lib/dates'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations()
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
        setError(t('settings.family.errorLoad'))
      }

      if (familyRow) {
        const resolvedFamilyName = familyRow.name ?? ''
        setFamilyName(resolvedFamilyName)
        if (resolvedFamilyName) {
          window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, resolvedFamilyName)
        } else {
          window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
        }
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
    const normalizedFamilyName = familyName.trim()
    setSavingFamily(true)
    setInviteStatus(null)
    setError(null)

    const { error: updateError } = await supabase.rpc('rename_my_family', { p_name: normalizedFamilyName })

    if (updateError) {
      setError(t('settings.family.errorSave'))
    } else {
      setFamilyName(normalizedFamilyName)
      if (normalizedFamilyName) {
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, normalizedFamilyName)
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
      }
    }

    setSavingFamily(false)
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    setInviteStatus(null)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError(t('settings.family.invites.errorSession'))
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
      setError(payload?.error || t('settings.family.invites.errorSend'))
      return
    }

    setInviteEmail('')
    setInviteStatus(t('settings.family.invites.success'))

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

    const { error: updateError } = await supabase.rpc('update_family_member_role', {
      p_member_id: memberId,
      p_role: role,
    })

    if (updateError) {
      setError(t('settings.family.members.errorUpdate'))
    } else {
      setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, role } : member)))
    }

    setSavingMemberId(null)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm(t('settings.family.members.confirmRemove'))) return
    setSavingMemberId(memberId)
    setError(null)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      setError(t('settings.family.members.errorSession'))
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
      setError(payload?.error || t('settings.family.members.errorRemove'))
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
      setError(t('settings.family.invites.errorSessionCancel'))
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
      setError(payload?.error || t('settings.family.invites.errorCancel'))
    } else {
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId))
    }

    setSavingInviteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">{t('settings.family.title')}</h1>
        <p className="text-sm text-ink/60 font-body">
          {t('settings.family.subtitle')}
        </p>
      </div>

      {error && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
          <p className="text-sm text-ink/60 font-body">{t('settings.family.loading')}</p>
        </div>
      ) : (
        <>
          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
            <form onSubmit={handleSaveFamily} className="space-y-4">
              <h2 className="text-lg font-serif text-coffee">{t('settings.family.familyName')}</h2>
              <div>
                <input
                  value={familyName}
                  onChange={(event) => setFamilyName(event.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  placeholder={t('settings.family.familyNamePlaceholder')}
                  aria-label={t('settings.family.familyNameLabel')}
                />
              </div>
              <button
                type="submit"
                disabled={savingFamily}
                className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
              >
                {savingFamily ? t('settings.family.savingFamily') : t('settings.family.saveFamily')}
              </button>
            </form>
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-coffee">{t('settings.family.members.title')}</h2>
              <p className="text-sm text-ink/60 font-body">
                {t('settings.family.members.subtitle')}
              </p>
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-ink/60 font-body">{t('settings.family.members.empty')}</p>
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
                        <div className="relative w-12 h-12 rounded-full bg-coffee/20 flex items-center justify-center overflow-hidden">
                          {member.avatar_url ? (
                            <Image src={member.avatar_url} alt={member.name} fill className="object-cover" />
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
                                {t('settings.family.members.you')}
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
                          className="px-3 py-2 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50 disabled:opacity-60"
                        >
                          <option value="admin">{t('settings.family.members.roleAdmin')}</option>
                          <option value="member">{t('settings.family.members.roleMember')}</option>
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

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-coffee">{t('settings.family.invites.title')}</h2>
              <p className="text-sm text-ink/60 font-body">
                {t('settings.family.invites.subtitle')}
              </p>
            </div>
            <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                aria-label={t('settings.family.invites.emailLabel')}
                className="flex-1 px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder={t('settings.family.invites.emailPlaceholder')}
              />
              <button
                type="submit"
                className="bg-petrol text-paper px-4 py-3 rounded-lg font-body hover:bg-petrol/90 transition-vintage"
              >
                {t('settings.family.invites.send')}
              </button>
            </form>
            {inviteStatus && (
              <div className="bg-petrol/10 border border-petrol/30 text-petrol px-4 py-3 rounded-lg text-sm">
                {inviteStatus}
              </div>
            )}
            {invites.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 bg-paper px-4 py-2 text-xs uppercase tracking-wide text-ink/60 font-body">
                  <span>{t('settings.family.invites.colEmail')}</span>
                  <span>{t('settings.family.invites.colStatus')}</span>
                  <span>{t('settings.family.invites.colExpires')}</span>
                  <span>{t('settings.family.invites.colActions')}</span>
                </div>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 sm:gap-4 px-4 py-3 text-sm font-body border-t border-border items-center"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-ink/50 sm:hidden">{t('settings.family.invites.colEmail')}</span>
                      <span className="text-ink break-all">{invite.email}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-ink/50 sm:hidden">{t('settings.family.invites.colStatus')}</span>
                      <span className="text-ink/70">
                        {invite.accepted ? t('settings.family.invites.statusAccepted') : t('settings.family.invites.statusPending')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] uppercase tracking-wide text-ink/50 sm:hidden">{t('settings.family.invites.colExpires')}</span>
                      <span className="text-ink/70">
                        {formatDate(invite.expires_at)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-start">
                      <span className="text-[11px] uppercase tracking-wide text-ink/50 sm:hidden">{t('settings.family.invites.colActions')}</span>
                      {!invite.accepted && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvite(invite.id)}
                          disabled={savingInviteId === invite.id}
                          className="text-sm text-terracotta hover:text-terracotta/80 disabled:opacity-50"
                        >
                          {t('settings.family.invites.cancel')}
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
