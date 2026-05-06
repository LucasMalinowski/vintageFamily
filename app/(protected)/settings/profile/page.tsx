'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

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
] as const

type CountryOption = (typeof COUNTRY_CODES)[number]

function findCountryBySlug(slug: string) {
  return COUNTRY_CODES.find((country) => country.slug === slug) ?? COUNTRY_CODES[0]
}

function findCountryByPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const match = [...COUNTRY_CODES]
    .sort((left, right) => right.code.length - left.code.length)
    .find((country) => digits.startsWith(country.code))

  return match ?? COUNTRY_CODES[0]
}

function countryLabel(country: CountryOption) {
  return `${country.flag} ${country.name}`
}

type DeletionInfo = {
  role: 'admin' | 'member'
  otherMembers: Array<{ id: string; name: string; email: string }>
}

export default function ProfileSettingsPage() {
  const { user, familyId, signOut } = useAuth()
  const router = useRouter()
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
  const [selectedCountrySlug, setSelectedCountrySlug] = useState('BR')
  const [phoneInput, setPhoneInput] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')
  const [pendingCountrySlug, setPendingCountrySlug] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [verifiedCountrySlug, setVerifiedCountrySlug] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [phoneSuccess, setPhoneSuccess] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryMenuOpen, setCountryMenuOpen] = useState(false)

  const [billingCycleDay, setBillingCycleDay] = useState(7)
  const [savingCycleDay, setSavingCycleDay] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null)
  const [deletionInfoLoading, setDeletionInfoLoading] = useState(false)
  const [selectedNewAdminId, setSelectedNewAdminId] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const selectedCountry = useMemo(
    () => findCountryBySlug(selectedCountrySlug),
    [selectedCountrySlug]
  )
  const pendingCountry = useMemo(
    () => (pendingCountrySlug ? findCountryBySlug(pendingCountrySlug) : findCountryByPhone(pendingPhone)),
    [pendingCountrySlug, pendingPhone]
  )
  const verifiedCountry = useMemo(
    () => (verifiedCountrySlug ? findCountryBySlug(verifiedCountrySlug) : findCountryByPhone(verifiedPhone)),
    [verifiedCountrySlug, verifiedPhone]
  )
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase()
    if (!query) return COUNTRY_CODES

    return COUNTRY_CODES.filter((country) => {
      return (
        country.name.toLowerCase().includes(query) ||
        country.slug.toLowerCase().includes(query) ||
        country.code.includes(query) ||
        country.flag.includes(query)
      )
    })
  }, [countrySearch])

  useEffect(() => {
    const loadData = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('name,email,avatar_url,phone_number,phone_number_pending,billing_cycle_day')
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
        setBillingCycleDay(userRow.billing_cycle_day ?? 7)
        if (userRow.phone_number) {
          const resolvedCountry = findCountryByPhone(userRow.phone_number)
          setVerifiedPhone(userRow.phone_number)
          setVerifiedCountrySlug(resolvedCountry.slug)
          setSelectedCountrySlug(resolvedCountry.slug)
          setPhoneState('verified')
        } else if (userRow.phone_number_pending) {
          const resolvedCountry = findCountryByPhone(userRow.phone_number_pending)
          setPendingPhone(userRow.phone_number_pending)
          setPendingCountrySlug(resolvedCountry.slug)
          setSelectedCountrySlug(resolvedCountry.slug)
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
    const fullPhone = `+${selectedCountry.code}${localDigits}`
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
        setPendingCountrySlug(selectedCountry.slug)
        setPhoneState('pending')
        setPhoneSuccess('Código enviado! Verifique seu WhatsApp.')
        setCountryMenuOpen(false)
        setCountrySearch('')
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
        setVerifiedCountrySlug(pendingCountrySlug || findCountryByPhone(pendingPhone).slug)
        setPhoneState('verified')
        setOtpInput('')
        setPhoneSuccess('Número verificado com sucesso!')
        posthog.capture(EVENTS.WHATSAPP_CONNECTED)
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
    setVerifiedCountrySlug('')
    setPendingCountrySlug('')
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

  const handleSaveCycleDay = async () => {
    if (!user) return
    setSavingCycleDay(true)
    await supabase.from('users').update({ billing_cycle_day: billingCycleDay }).eq('id', user.id)
    setSavingCycleDay(false)
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  const handleOpenDeleteModal = async () => {
    setDeleteModalOpen(true)
    setDeleteError(null)
    setDeleteConfirmText('')
    setSelectedNewAdminId('')
    setDeletionInfo(null)
    setDeletionInfoLoading(true)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setDeleteError('Sessão expirada. Faça login novamente.')
      setDeletionInfoLoading(false)
      return
    }

    try {
      const res = await fetch('/api/account/deletion-info', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? 'Erro ao carregar informações.')
      } else {
        setDeletionInfo(data)
        if (data.otherMembers?.length > 0) {
          setSelectedNewAdminId(data.otherMembers[0].id)
        }
      }
    } catch {
      setDeleteError('Erro de conexão.')
    }

    setDeletionInfoLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (!deletionInfo) return
    setDeleting(true)
    setDeleteError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setDeleteError('Sessão expirada. Faça login novamente.')
      setDeleting(false)
      return
    }

    try {
      const body: Record<string, string> = {}
      if (deletionInfo.role === 'admin' && deletionInfo.otherMembers.length > 0) {
        body.newAdminId = selectedNewAdminId
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error ?? 'Erro ao excluir conta.')
        setDeleting(false)
        return
      }

      await signOut()
      router.push('/login')
    } catch {
      setDeleteError('Erro de conexão.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[560px]">
      {error && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-ink/60 font-body">Carregando...</div>
      ) : (
        <>
          {/* Avatar + name + email header */}
          <div className="flex items-center gap-5 mb-2">
            <div className="relative shrink-0">
              <div className="w-[72px] h-[72px] rounded-full bg-[#B05C3A] flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {profileName ? profileName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : 'U'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="font-serif text-[22px] text-coffee leading-tight">{profileName || 'Seu nome'}</p>
              <p className="text-sm text-ink/55 mt-1">{profileEmail}</p>
              <label className="mt-2 inline-block cursor-pointer px-3 py-1.5 rounded-lg border border-border text-sm text-ink hover:bg-paper transition-vintage">
                Trocar foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative sm:w-[280px]">
                    <button
                      type="button"
                      onClick={() => {
                        setCountryMenuOpen((current) => !current)
                        setCountrySearch('')
                      }}
                      className="w-full px-3 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage text-sm text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-ink">
                            {countryLabel(selectedCountry)}
                          </div>
                          <div className="truncate text-[11px] text-ink/50">
                            +{selectedCountry.code} {selectedCountry.slug}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 shrink-0 text-ink/40" />
                      </div>
                    </button>

                    {countryMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Fechar lista de países"
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setCountryMenuOpen(false)}
                        />
                        <div className="absolute z-30 mt-2 w-full rounded-[16px] border border-border/70 bg-offWhite p-2 shadow-soft">
                          <div className="mb-2 rounded-[12px] border border-border/70 bg-paper px-3 py-2">
                            <label className="flex items-center gap-2">
                              <Search className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(event) => setCountrySearch(event.target.value)}
                                placeholder="Buscar país, código ou sigla"
                                className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
                                autoFocus
                              />
                            </label>
                          </div>
                          <div className="max-h-72 overflow-auto space-y-1">
                            {filteredCountries.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-ink/45">Nenhum resultado.</div>
                            ) : (
                              filteredCountries.map((country) => {
                                const isSelected = country.slug === selectedCountry.slug
                                return (
                                  <button
                                    key={country.slug}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountrySlug(country.slug)
                                      setCountryMenuOpen(false)
                                      setCountrySearch('')
                                    }}
                                    className={`w-full rounded-[12px] px-3 py-2.5 text-left transition-vintage ${
                                      isSelected ? 'bg-coffee/8' : 'hover:bg-coffee/6'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-sidebar">
                                          {country.flag} {country.name}
                                        </div>
                                        <div className="truncate text-[11px] text-ink/45">
                                          +{country.code} · {country.slug}
                                        </div>
                                      </div>
                                      {isSelected ? (
                                        <Check className="h-4 w-4 shrink-0 text-coffee" aria-hidden="true" />
                                      ) : null}
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
                <p className="text-sm text-ink/70">
                  Código enviado para <strong>{countryLabel(pendingCountry)} · {pendingPhone}</strong>
                </p>
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
                <span className="text-sm font-body text-olive">
                  ✓ {countryLabel(verifiedCountry)} · {verifiedPhone}
                </span>
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
              <div>
                <label className="block text-sm font-body text-ink mb-1.5">
                  Nome completo <span className="text-terracotta">*</span>
                </label>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-body text-ink mb-1.5">
                  E-mail <span className="text-terracotta">*</span>
                </label>
                <input
                  value={profileEmail}
                  disabled
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/60"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-coffee text-paper px-5 py-2.5 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-ink">Dia do ciclo financeiro</h2>
              <p className="text-sm text-ink/60 font-body mt-1">
                Informe o dia do mês em que você recebe seu salário. O filtro de "mês" vai usar esse dia como início do período.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={billingCycleDay}
                onChange={(e) => setBillingCycleDay(Number(e.target.value))}
                className="px-4 py-2.5 bg-paper border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>Dia {d}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveCycleDay}
                disabled={savingCycleDay}
                className="bg-coffee text-paper px-5 py-2.5 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50 text-sm"
              >
                {savingCycleDay ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <p className="text-xs text-ink/40">
              Ex.: se você recebe no dia 21, o "mês de maio" vai de 21 de abril até 20 de maio.
            </p>
          </div>

          <div className="bg-bg border border-terracotta/30 rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-terracotta">Zona de perigo</h2>
              <p className="text-sm text-ink/60 font-body mt-1">
                Ações irreversíveis. Proceda com cuidado.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-ink">Excluir minha conta</p>
                <p className="text-xs text-ink/50 mt-0.5">Remove sua conta permanentemente.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenDeleteModal}
                className="px-4 py-2 rounded-lg border border-terracotta text-terracotta text-sm font-body hover:bg-terracotta/10 transition-vintage"
              >
                Excluir conta
              </button>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} title="Excluir conta" size="sm">
        <div className="space-y-4">
          {deletionInfoLoading ? (
            <p className="text-sm text-ink/60">Carregando informações...</p>
          ) : (
            <>
              {deleteError && (
                <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-3 py-2 rounded-lg text-sm">
                  {deleteError}
                </div>
              )}

              {deletionInfo?.role === 'admin' && deletionInfo.otherMembers.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-ink/80">
                    Você é administrador da família. Escolha quem assumirá a administração:
                  </p>
                  <select
                    value={selectedNewAdminId}
                    onChange={(e) => setSelectedNewAdminId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  >
                    {deletionInfo.otherMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {deletionInfo?.role === 'admin' && deletionInfo.otherMembers.length === 0 && (
                <div className="bg-terracotta/8 border border-terracotta/20 rounded-lg px-3 py-2.5">
                  <p className="text-sm text-ink/80">
                    Você é o único membro desta família. Ao excluir sua conta, a família será
                    desativada permanentemente.
                  </p>
                </div>
              )}

              {deletionInfo?.role === 'member' && (
                <p className="text-sm text-ink/80">
                  Sua conta e seus dados pessoais serão removidos permanentemente.
                </p>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-body text-ink">
                  Digite <strong>EXCLUIR</strong> para confirmar
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full px-3 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition-vintage"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== 'EXCLUIR' || !deletionInfo}
                  className="flex-1 bg-terracotta text-paper px-4 py-2 rounded-lg text-sm font-body hover:bg-terracotta/90 transition-vintage disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Excluir minha conta'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-border text-ink/70 text-sm font-body hover:bg-paper-2/30 transition-vintage disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
