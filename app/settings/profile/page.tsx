'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

export default function ProfileSettingsPage() {
  const { user, familyId } = useAuth()
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      if (userError) {
        setError('Erro ao carregar configurações.')
      }

      if (userRow) {
        setProfileName(userRow.name ?? '')
        setProfileEmail(userRow.email ?? user.email ?? '')
        setAvatarUrl(userRow.avatar_url ?? '')
        setAvatarPreview(userRow.avatar_url ?? '')
      } else if (user?.email) {
        setProfileEmail(user.email)
      }
      setLoading(false)
    }

    loadData()
  }, [user])

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSavingProfile(true)
    setError(null)

    let nextAvatarUrl = avatarUrl

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop() || 'jpg'
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Erro ao enviar avatar.')
        setSavingProfile(false)
        return
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      nextAvatarUrl = publicUrlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ name: profileName.trim(), avatar_url: nextAvatarUrl ? nextAvatarUrl : null })
      .eq('id', user.id)

    if (updateError) {
      setError('Erro ao salvar perfil.')
    } else {
      setAvatarUrl(nextAvatarUrl)
      setAvatarPreview(nextAvatarUrl)
      setAvatarFile(null)
    }

    setSavingProfile(false)
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  return (
    <div className="space-y-6">
      <div className="bg-paper-2 border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-2">Perfil</h1>
        <p className="text-sm text-ink/60 font-body">
          Atualize seus dados pessoais e a identidade da família.
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
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h2 className="text-lg font-serif text-coffee">Seus dados</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-coffee/20 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-coffee text-xl font-serif">
                      {profileName ? profileName.slice(0, 1).toUpperCase() : 'A'}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-body text-ink mb-2">Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full text-sm text-ink/60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-body text-ink mb-2">Nome</label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 transition-vintage"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-ink mb-2">Email</label>
                <input
                  value={profileEmail}
                  disabled
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/60"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
              >
                {savingProfile ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
