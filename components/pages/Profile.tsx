'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Topbar from '@/components/layout/Topbar'
import { Camera } from 'lucide-react'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'

export default function Profile() {
  const { user, familyId } = useAuth()
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

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('name,email,avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (userError) setError('Erro ao carregar dados.')

      if (userRow) {
        setProfileName(userRow.name ?? '')
        setProfileEmail(userRow.email ?? user.email ?? '')
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
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
        nextAvatarUrl = publicUrlData.publicUrl
      } else {
        setError('Erro ao enviar foto.')
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: profileName.trim(), avatar_url: nextAvatarUrl || null })
      .eq('id', user.id)

    if (updateError) {
      setError('Erro ao salvar perfil.')
    } else {
      setAvatarUrl(nextAvatarUrl)
      setAvatarFile(null)
    }

    setSaving(false)
  }

  return (
    <>
      <Topbar
        title="Meu Perfil"
        subtitle="Dados pessoais e familia"
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
          <div className="text-center py-12 text-ink/60">Carregando...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <div className="w-[88px] h-[88px] rounded-full bg-[#B05C3A] flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
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
                onChange={handleAvatarChange}
              />
              <div className="text-center">
                <p className="font-serif text-xl text-coffee">{profileName || 'Usuário'}</p>
                <p className="text-sm text-ink/50">Família {familyName || '—'}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  Nome Completo
                </label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee/25 transition-vintage text-ink"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  E-mail
                </label>
                <input
                  value={profileEmail}
                  disabled
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-2">
                  Família
                </label>
                <input
                  value={familyName}
                  disabled
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/50 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-sidebar text-paper rounded-[14px] font-semibold text-base hover:bg-sidebar/90 transition-vintage disabled:opacity-60 shadow-soft"
            >
              {saving ? 'Salvando...' : 'Editar perfil'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
