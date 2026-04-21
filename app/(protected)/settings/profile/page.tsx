'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

type PhoneState = 'none' | 'pending' | 'verified'

const COUNTRY_CODES = [
  { code: '55',  flag: '🇧🇷', name: 'Brasil',          slug: 'BR' },
  { code: '1',   flag: '🇺🇸', name: 'EUA',             slug: 'US' },
  { code: '351', flag: '🇵🇹', name: 'Portugal',        slug: 'PT' },
  { code: '54',  flag: '🇦🇷', name: 'Argentina',       slug: 'AR' },
  { code: '56',  flag: '🇨🇱', name: 'Chile',           slug: 'CL' },
  { code: '57',  flag: '🇨🇴', name: 'Colômbia',        slug: 'CO' },
  { code: '52',  flag: '🇲🇽', name: 'México',          slug: 'MX' },
  { code: '598', flag: '🇺🇾', name: 'Uruguai',         slug: 'UY' },
  { code: '595', flag: '🇵🇾', name: 'Paraguai',        slug: 'PY' },
  { code: '51',  flag: '🇵🇪', name: 'Peru',            slug: 'PE' },
  { code: '34',  flag: '🇪🇸', name: 'Espanha',         slug: 'ES' },
  { code: '44',  flag: '🇬🇧', name: 'Reino Unido',     slug: 'GB' },
  { code: '49',  flag: '🇩🇪', name: 'Alemanha',        slug: 'DE' },
  { code: '33',  flag: '🇫🇷', name: 'França',          slug: 'FR' },
  { code: '39',  flag: '🇮🇹', name: 'Itália',          slug: 'IT' },
  { code: '81',  flag: '🇯🇵', name: 'Japão',           slug: 'JP' },
  { code: '86',  flag: '🇨🇳', name: 'China',           slug: 'CN' },
  { code: '91',  flag: '🇮🇳', name: 'Índia',           slug: 'IN' },
  { code: '61',  flag: '🇦🇺', name: 'Austrália',       slug: 'AU' },
  { code: '1',   flag: '🇨🇦', name: 'Canadá',          slug: 'CA' },
]

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

  // Phone OTP state
  const [phoneState, setPhoneState] = useState<PhoneState>('none')
  const [countryCode, setCountryCode] = useState('55')
  const [phoneInput, setPhoneInput] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('name,email,avatar_url,phone_number,phone_number_pending')
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
        if (userRow.phone_number) {
          setVerifiedPhone(userRow.phone_number)
          setPhoneState('verified')
        } else if (userRow.phone_number_pending) {
          setPendingPhone(userRow.phone_number_pending)
          setPhoneState('pending')
        }
      } else if (user?.email) {
        setProfileEmail(user.email)
      }
      setLoading(false)
    }

    loadData()
  }, [user])

  const handleSendOtp = async () => {
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    const localDigits = phoneInput.replace(/\D/g, '')
    const fullPhone = `+${countryCode}${localDigits}`
    try {
      const res = await fetch('/api/whatsapp/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error ?? 'Erro ao enviar código.')
      } else {
        setPendingPhone(fullPhone)
        setPhoneState('pending')
        setPhoneSuccess('Código enviado! Verifique seu WhatsApp.')
      }
    } catch {
      setPhoneError('Erro de conexão.')
    }
    setPhoneLoading(false)
  }

  const handleConfirmOtp = async () => {
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    try {
      const res = await fetch('/api/whatsapp/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error ?? 'Código inválido.')
      } else {
        setVerifiedPhone(pendingPhone)
        setPhoneState('verified')
        setOtpInput('')
        setPhoneSuccess('Número verificado com sucesso!')
      }
    } catch {
      setPhoneError('Erro de conexão.')
    }
    setPhoneLoading(false)
  }

  const handleRemovePhone = async () => {
    if (!user) return
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    await supabase
      .from('users')
      .update({ phone_number: null, phone_number_pending: null, phone_verification_code: null, phone_verification_expires_at: null })
      .eq('id', user.id)
    setVerifiedPhone('')
    setPendingPhone('')
    setPhoneInput('')
    setPhoneState('none')
    setPhoneLoading(false)
  }

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
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
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
        <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
          <p className="text-sm text-ink/60 font-body">Carregando...</p>
        </div>
      ) : (
        <>
          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <h2 className="text-lg font-serif text-coffee">WhatsApp</h2>
            <p className="text-sm text-ink/60 font-body">
              Vincule seu número para registrar despesas e receitas pelo WhatsApp.
            </p>

            {phoneError && (
              <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-3 py-2 rounded-lg text-sm">
                {phoneError}
              </div>
            )}
            {phoneSuccess && (
              <div className="bg-olive/10 border border-olive/30 text-olive px-3 py-2 rounded-lg text-sm">
                {phoneSuccess}
              </div>
            )}

            {phoneState === 'none' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="px-3 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage text-sm shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.slug}-${c.code}`} value={c.code}>
                        {c.flag} +{c.code} ({c.slug})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="45 99999-9999"
                    className="flex-1 px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={phoneLoading || !phoneInput.trim()}
                  className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50 whitespace-nowrap"
                >
                  {phoneLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              </div>
            )}

            {phoneState === 'pending' && (
              <div className="space-y-3">
                <p className="text-sm text-ink/70">Código enviado para <strong>{pendingPhone}</strong></p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-32 px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage text-center tracking-widest font-numbers"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmOtp}
                    disabled={phoneLoading || otpInput.length !== 6}
                    className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
                  >
                    {phoneLoading ? 'Verificando...' : 'Verificar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpInput('')
                      setPhoneSuccess(null)
                      setPhoneError(null)
                      setPhoneState('none')
                      setPhoneInput('')
                    }}
                    className="text-sm text-ink/50 hover:text-ink px-2 py-2"
                  >
                    Trocar número
                  </button>
                </div>
              </div>
            )}

            {phoneState === 'verified' && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-body text-olive">✓ {verifiedPhone}</span>
                <button
                  type="button"
                  onClick={handleRemovePhone}
                  disabled={phoneLoading}
                  className="text-sm text-terracotta hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
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
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
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
