'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { Camera } from 'lucide-react'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { validateImageFile } from '@/lib/security/images'
import { useTranslations } from 'next-intl'

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getAuthDisplayName(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  const identityData = user.identities?.[0]?.identity_data as Record<string, unknown> | undefined
  return cleanString(user.user_metadata?.name) ||
    cleanString(user.user_metadata?.full_name) ||
    cleanString(user.user_metadata?.display_name) ||
    cleanString(identityData?.name) ||
    cleanString(identityData?.full_name) ||
    cleanString(identityData?.display_name) ||
    cleanString(user.email?.split('@')[0])
}

export default function Profile() {
  const { user, familyId } = useAuth()
  const t = useTranslations()
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch('/api/profile/me', {
        headers: sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {},
      })
      const userRow = response.ok ? await response.json() : null

      if (!response.ok) setError(t('profile.errorLoad'))

      if (userRow) {
        setProfileName(cleanString(userRow.name) || getAuthDisplayName(user))
        setProfileEmail(user.email ?? userRow.email ?? '')
        setAvatarUrl(userRow.avatar_url ?? '')
        setAvatarPreview(userRow.avatar_url ?? '')
      } else if (user?.email) {
        setProfileEmail(user.email)
      }

      const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.familyName)
      if (cached) {
        setFamilyName(cached)
      } else if (familyId) {
        const { data: familyRow } = await supabase
          .from('families')
          .select('name')
          .eq('id', familyId)
          .maybeSingle()
        if (familyRow?.name) setFamilyName(familyRow.name)
      }

      setLoading(false)
    }
    loadData()
  }, [user, familyId])

  const initials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)

    let nextAvatarUrl = avatarUrl

    if (avatarFile) {
      let image
      try {
        image = await validateImageFile(avatarFile, 2 * 1024 * 1024)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('profile.errorAvatar'))
        setSaving(false)
        return
      }
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}.${image.extension}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { contentType: image.mime, upsert: true })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        nextAvatarUrl = publicUrlData.publicUrl
      } else {
        setError(t('profile.errorAvatarUpload'))
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: profileName.trim(), avatar_url: nextAvatarUrl || null })
      .eq('id', user.id)

    if (updateError) {
      setError(t('profile.errorSave'))
    } else {
      setAvatarUrl(nextAvatarUrl)
      setAvatarFile(null)
    }

    setSaving(false)
  }

  return (
    <>
      <Topbar
        title={t('profileSheet.myProfile')}
        subtitle={t('profileSheet.myProfileDesc')}
        showBackButton
        variant="textured"
      />

      <div className="max-w-lg mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-ink/60">{t('common.loading')}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="relative w-[88px] h-[88px] rounded-full bg-[#B05C3A] flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Avatar" fill unoptimized className="object-cover" />
                  ) : (
                    <span className="text-[28px] font-bold text-white leading-none">{initials || 'U'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sidebar flex items-center justify-center border-2 border-paper hover:bg-sidebar/90 transition-vintage"
                  aria-label="Editar foto"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Selecionar foto de perfil"
                onChange={handleAvatarChange}
              />
              <div className="text-center">
                <p className="font-serif text-xl text-coffee">{profileName || 'Usuário'}</p>
                <p className="text-sm text-ink/50">Família {familyName || '-'}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="profile-page-name" className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  {t('profile.form.fullName')}
                </label>
                <input
                  id="profile-page-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee/25 transition-vintage text-ink"
                  placeholder={t('profile.form.namePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="profile-page-email" className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  {t('profile.form.email')}
                </label>
                <input
                  id="profile-page-email"
                  value={profileEmail}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/50 cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="profile-page-family" className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  {t('sidebar.family')}
                </label>
                <input
                  id="profile-page-family"
                  value={familyName}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/50 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-sidebar text-paper rounded-[14px] font-semibold text-base hover:bg-sidebar/90 transition-vintage disabled:opacity-60 shadow-soft"
            >
              {saving ? t('common.saving') : t('profile.saveChanges')}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
