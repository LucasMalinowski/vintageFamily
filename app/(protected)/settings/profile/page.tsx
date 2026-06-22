'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import { useRouter } from 'next/navigation'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import { ImageValidationError, validateImageFile } from '@/lib/security/images'
import { NEXT_LOCALE_COOKIE, SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n/getLocale'
import { CURRENCIES, SUPPORTED_CURRENCIES, countryCodeToFlag, type AppCurrency } from '@/lib/i18n/currencies'

type PhoneState = 'none' | 'pending' | 'verified'

const COUNTRY_CODES = [
  { code: '55',  flag: '🇧🇷', slug: 'BR' },
  { code: '1',   flag: '🇺🇸', slug: 'US' },
  { code: '351', flag: '🇵🇹', slug: 'PT' },
  { code: '54',  flag: '🇦🇷', slug: 'AR' },
  { code: '56',  flag: '🇨🇱', slug: 'CL' },
  { code: '57',  flag: '🇨🇴', slug: 'CO' },
  { code: '52',  flag: '🇲🇽', slug: 'MX' },
  { code: '598', flag: '🇺🇾', slug: 'UY' },
  { code: '595', flag: '🇵🇾', slug: 'PY' },
  { code: '51',  flag: '🇵🇪', slug: 'PE' },
  { code: '34',  flag: '🇪🇸', slug: 'ES' },
  { code: '44',  flag: '🇬🇧', slug: 'GB' },
  { code: '49',  flag: '🇩🇪', slug: 'DE' },
  { code: '33',  flag: '🇫🇷', slug: 'FR' },
  { code: '39',  flag: '🇮🇹', slug: 'IT' },
  { code: '81',  flag: '🇯🇵', slug: 'JP' },
  { code: '86',  flag: '🇨🇳', slug: 'CN' },
  { code: '91',  flag: '🇮🇳', slug: 'IN' },
  { code: '61',  flag: '🇦🇺', slug: 'AU' },
  { code: '1',   flag: '🇨🇦', slug: 'CA' },
] as const

type CountryOption = (typeof COUNTRY_CODES)[number]

function getAvatarValidationErrorMessage(err: unknown, t: ReturnType<typeof useTranslations>): string {
  if (err instanceof ImageValidationError) {
    const messageByCode: Record<typeof err.code, string> = {
      too_large: t('profile.errorAvatarTooLarge'),
      invalid_image: t('profile.errorAvatar'),
      extension_mismatch: t('profile.errorAvatarExtensionMismatch'),
      mime_mismatch: t('profile.errorAvatarMimeMismatch'),
    }
    return messageByCode[err.code]
  }
  return t('profile.errorAvatar')
}

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

function countryLabel(country: CountryOption, t: ReturnType<typeof useTranslations>) {
  return `${country.flag} ${t(`countries.${country.slug}`)}`
}

function findCurrencyByCode(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

type DeletionInfo = {
  role: 'admin' | 'member'
  otherMembers: Array<{ id: string; name: string; email: string }>
}

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

export default function ProfileSettingsPage() {
  const { user, familyId, signOut } = useAuth()
  const router = useRouter()
  const t = useTranslations()
  const [locale, setLocale] = useState<AppLocale>('pt-BR')
  const [currency, setCurrency] = useState<AppCurrency>('BRL')
  const [savingLocale, setSavingLocale] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false)
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
        t(`countries.${country.slug}`).toLowerCase().includes(query) ||
        country.slug.toLowerCase().includes(query) ||
        country.code.includes(query) ||
        country.flag.includes(query)
      )
    })
  }, [countrySearch, t])
  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase()
    if (!query) return CURRENCIES

    return CURRENCIES.filter((c) => {
      return (
        c.code.toLowerCase().includes(query) ||
        c.countryName.toLowerCase().includes(query) ||
        c.symbol?.toLowerCase().includes(query) ||
        t(`language.currencies.${c.code}`).toLowerCase().includes(query)
      )
    })
  }, [currencySearch, t])

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

      if (!response.ok) {
        setError(t('profile.errorLoad'))
      }

      if (userRow) {
        setProfileName(cleanString(userRow.name) || getAuthDisplayName(user))
        setProfileEmail(user.email ?? userRow.email ?? '')
        setAvatarUrl(userRow.avatar_url ?? '')
        setAvatarPreview(userRow.avatar_url ?? '')
        setBillingCycleDay(userRow.billing_cycle_day ?? 7)
        if (SUPPORTED_LOCALES.includes(userRow.locale)) {
          setLocale(userRow.locale)
        }
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

  useEffect(() => {
    const loadFamilyCurrency = async () => {
      if (!familyId) return
      const { data } = await (supabase.from('families') as any)
        .select('currency')
        .eq('id', familyId)
        .maybeSingle()
      if (data?.currency && SUPPORTED_CURRENCIES.includes(data.currency)) {
        setCurrency(data.currency)
      }
    }

    loadFamilyCurrency()
  }, [familyId])

  const handleChangeLocale = async (next: AppLocale) => {
    if (!user || next === locale) return
    setSavingLocale(true)
    setLocale(next)
    document.cookie = `${NEXT_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`
    await (supabase.from('users') as any).update({ locale: next }).eq('id', user.id)
    setSavingLocale(false)
    router.refresh()
  }

  const handleChangeCurrency = async (next: AppCurrency) => {
    if (!familyId || next === currency) return
    setSavingCurrency(true)
    setCurrency(next)
    await (supabase.from('families') as any).update({ currency: next }).eq('id', familyId)
    setSavingCurrency(false)
  }

  const handleSendOtp = async () => {
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    const localDigits = phoneInput.replace(/\D/g, '')
    const fullPhone = `+${selectedCountry.code}${localDigits}`
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch('/api/whatsapp/verify/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error ?? t('profile.whatsapp.errorSend'))
      } else {
        setPendingPhone(fullPhone)
        setPendingCountrySlug(selectedCountry.slug)
        setPhoneState('pending')
        setPhoneSuccess(t('profile.whatsapp.codeSent'))
        setCountryMenuOpen(false)
        setCountrySearch('')
      }
    } catch {
      setPhoneError(t('common.connectionError'))
    }
    setPhoneLoading(false)
  }

  const handleConfirmOtp = async () => {
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch('/api/whatsapp/verify/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ code: otpInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPhoneError(data.error ?? t('profile.whatsapp.errorInvalidCode'))
      } else {
        setVerifiedPhone(pendingPhone)
        setVerifiedCountrySlug(pendingCountrySlug || findCountryByPhone(pendingPhone).slug)
        setPhoneState('verified')
        setOtpInput('')
        setPhoneSuccess(t('profile.whatsapp.verifiedSuccess'))
        posthog.capture(EVENTS.WHATSAPP_CONNECTED)
      }
    } catch {
      setPhoneError(t('common.connectionError'))
    }
    setPhoneLoading(false)
  }

  const handleRemovePhone = async () => {
    if (!user) return
    setPhoneLoading(true)
    setPhoneError(null)
    setPhoneSuccess(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch('/api/whatsapp/verify/remove', {
      method: 'POST',
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {},
    })
    if (!res.ok) {
      setPhoneError(t('profile.whatsapp.errorRemove'))
      setPhoneLoading(false)
      return
    }
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
      let image
      try {
        image = await validateImageFile(avatarFile, 2 * 1024 * 1024)
      } catch (err) {
        setError(getAvatarValidationErrorMessage(err, t))
        setSavingProfile(false)
        return
      }
      const safeName = avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user.id}/${Date.now()}-${safeName.replace(/\.[^.]+$/, '')}.${image.extension}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { contentType: image.mime, upsert: true })

      if (uploadError) {
        setError(t('profile.errorAvatarUpload'))
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
      setError(t('profile.errorSave'))
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
      setDeleteError(t('profile.deleteModal.errorSession'))
      setDeletionInfoLoading(false)
      return
    }

    try {
      const res = await fetch('/api/account/deletion-info', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error ?? t('profile.deleteModal.errorLoad'))
      } else {
        setDeletionInfo(data)
        if (data.otherMembers?.length > 0) {
          setSelectedNewAdminId(data.otherMembers[0].id)
        }
      }
    } catch {
      setDeleteError(t('common.connectionError'))
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
      setDeleteError(t('profile.deleteModal.errorSession'))
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
        setDeleteError(data.error ?? t('profile.deleteModal.errorDelete'))
        setDeleting(false)
        return
      }

      await signOut()
      router.push('/login')
    } catch {
      setDeleteError(t('common.connectionError'))
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
        <div className="py-8 text-center text-sm text-ink/60 font-body">{t('common.loading')}</div>
      ) : (
        <>
          {/* Avatar + name + email header */}
          <div className="flex items-center gap-5 mb-2">
            <div className="relative shrink-0">
              <div className="relative w-[72px] h-[72px] rounded-full bg-[#B05C3A] flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" fill unoptimized className="object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {profileName ? profileName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : 'U'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="font-serif text-[22px] text-coffee leading-tight">{profileName || t('profile.yourName')}</p>
              <p className="text-sm text-ink/55 mt-1">{profileEmail}</p>
              <label className="mt-2 inline-block cursor-pointer px-3 py-1.5 rounded-lg border border-border text-sm text-ink hover:bg-paper transition-vintage">
                {t('profile.changePicture')}
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
            <h2 className="text-lg font-serif text-coffee">{t('profile.whatsapp.title')}</h2>
            <p className="text-sm text-ink/60 font-body">
              {t('profile.whatsapp.subtitle')}
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
                            {countryLabel(selectedCountry, t)}
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
                          aria-label={t('profile.closeCountryListAria')}
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
                                placeholder={t('profile.whatsapp.searchPlaceholder')}
                                className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
                                autoFocus
                              />
                            </label>
                          </div>
                          <div className="max-h-72 overflow-auto space-y-1">
                            {filteredCountries.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-ink/45">{t('profile.whatsapp.noResults')}</div>
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
                                          {country.flag} {t(`countries.${country.slug}`)}
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
                    aria-label={t('profile.phoneNumberAria')}
                    className="flex-1 px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={phoneLoading || !phoneInput.trim()}
                  className="bg-coffee text-paper px-4 py-2 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50 whitespace-nowrap"
                >
                  {phoneLoading ? t('profile.whatsapp.sending') : t('profile.whatsapp.sendCode')}
                </button>
              </div>
            )}

            {phoneState === 'pending' && (
              <div className="space-y-3">
                <p className="text-sm text-ink/70">
                  {t('profile.whatsapp.codeFor')} <strong>{countryLabel(pendingCountry, t)} · {pendingPhone}</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    aria-label={t('profile.verificationCodeAria')}
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
                    {phoneLoading ? t('profile.whatsapp.verifying') : t('profile.whatsapp.verify')}
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
                    {t('profile.whatsapp.changeNumber')}
                  </button>
                </div>
              </div>
            )}

            {phoneState === 'verified' && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-body text-olive">
                  ✓ {countryLabel(verifiedCountry, t)} · {verifiedPhone}
                </span>
                <button
                  type="button"
                  onClick={handleRemovePhone}
                  disabled={phoneLoading}
                  className="text-sm text-terracotta hover:underline disabled:opacity-50"
                >
                  {t('profile.whatsapp.remove')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="profile-settings-name" className="block text-sm font-body text-ink mb-1.5">
                  {t('profile.form.fullName')} <span className="text-terracotta">*</span>
                </label>
                <input
                  id="profile-settings-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                  placeholder={t('profile.form.namePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="profile-settings-email" className="block text-sm font-body text-ink mb-1.5">
                  {t('profile.form.email')} <span className="text-terracotta">*</span>
                </label>
                <input
                  id="profile-settings-email"
                  value={profileEmail}
                  disabled
                  readOnly
                  className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-ink/60"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-coffee text-paper px-5 py-2.5 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
                >
                  {savingProfile ? t('common.saving') : t('profile.saveChanges')}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-ink">{t('profile.billingCycle.title')}</h2>
              <p className="text-sm text-ink/60 font-body mt-1">
                {t('profile.billingCycle.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={billingCycleDay}
                onChange={(e) => setBillingCycleDay(Number(e.target.value))}
                className="px-4 py-2.5 bg-paper border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{t('profile.billingCycle.dayOption', { day: d })}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveCycleDay}
                disabled={savingCycleDay}
                className="bg-coffee text-paper px-5 py-2.5 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50 text-sm"
              >
                {savingCycleDay ? t('profile.billingCycle.saving') : t('profile.billingCycle.save')}
              </button>
            </div>
            <p className="text-xs text-ink/40">
              {t('profile.billingCycle.example')}
            </p>
          </div>

          <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-coffee">{t('language.title')}</h2>
              <p className="text-sm text-ink/60 font-body mt-1">{t('language.subtitle')}</p>
            </div>
            <div>
              <label className="block text-sm font-body text-ink mb-1.5">{t('language.languageLabel')}</label>
              <select
                value={locale}
                onChange={(e) => handleChangeLocale(e.target.value as AppLocale)}
                disabled={savingLocale}
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage text-sm disabled:opacity-50"
              >
                {SUPPORTED_LOCALES.map((code) => (
                  <option key={code} value={code}>{t(`language.names.${code}`)}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-body text-ink mb-1.5">{t('language.currencyLabel')}</label>
              <button
                type="button"
                onClick={() => {
                  setCurrencyMenuOpen((current) => !current)
                  setCurrencySearch('')
                }}
                disabled={savingCurrency || !familyId}
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage text-sm text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 truncate font-medium text-ink">
                    {countryCodeToFlag(findCurrencyByCode(currency).country)} {currency} - {t(`language.currencies.${currency}`)}
                  </div>
                  <ChevronDown className="w-4 h-4 shrink-0 text-ink/40" />
                </div>
              </button>

              {currencyMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label={t('language.closeCurrencyListAria')}
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setCurrencyMenuOpen(false)}
                  />
                  <div className="absolute z-30 mt-2 w-full rounded-[16px] border border-border/70 bg-offWhite p-2 shadow-soft">
                    <div className="mb-2 rounded-[12px] border border-border/70 bg-paper px-3 py-2">
                      <label className="flex items-center gap-2">
                        <Search className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
                        <input
                          type="text"
                          value={currencySearch}
                          onChange={(event) => setCurrencySearch(event.target.value)}
                          placeholder={t('language.currencySearchPlaceholder')}
                          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
                          autoFocus
                        />
                      </label>
                    </div>
                    <div className="max-h-72 overflow-auto space-y-1">
                      {filteredCurrencies.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-ink/45">{t('language.currencyNoResults')}</div>
                      ) : (
                        filteredCurrencies.map((c) => {
                          const isSelected = c.code === currency
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                handleChangeCurrency(c.code as AppCurrency)
                                setCurrencyMenuOpen(false)
                                setCurrencySearch('')
                              }}
                              className={`w-full rounded-[12px] px-3 py-2.5 text-left transition-vintage ${
                                isSelected ? 'bg-coffee/8' : 'hover:bg-coffee/6'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="min-w-0 flex-1 truncate text-sm font-medium text-sidebar">
                                  {countryCodeToFlag(c.country)} {c.code} - {t(`language.currencies.${c.code}`)}
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
          </div>

          <div className="bg-bg border border-terracotta/30 rounded-vintage shadow-vintage p-6 space-y-4">
            <div>
              <h2 className="text-lg font-serif text-terracotta">{t('profile.dangerZone.title')}</h2>
              <p className="text-sm text-ink/60 font-body mt-1">
                {t('profile.dangerZone.subtitle')}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-body text-ink">{t('profile.dangerZone.deleteAccount')}</p>
                <p className="text-xs text-ink/50 mt-0.5">{t('profile.dangerZone.deleteDescription')}</p>
              </div>
              <button
                type="button"
                onClick={handleOpenDeleteModal}
                className="px-4 py-2 rounded-lg border border-terracotta text-terracotta text-sm font-body hover:bg-terracotta/10 transition-vintage"
              >
                {t('profile.dangerZone.deleteButton')}
              </button>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} title={t('profile.deleteModal.title')} size="sm">
        <div className="space-y-4">
          {deletionInfoLoading ? (
            <p className="text-sm text-ink/60">{t('profile.deleteModal.loading')}</p>
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
                    {t('profile.deleteModal.adminWithMembers')}
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
                    {t('profile.deleteModal.adminAlone')}
                  </p>
                </div>
              )}

              {deletionInfo?.role === 'member' && (
                <p className="text-sm text-ink/80">
                  {t('profile.deleteModal.memberMessage')}
                </p>
              )}

              <div className="space-y-1.5">
                <label htmlFor="delete-confirm" className="block text-sm font-body text-ink">
                  {t('profile.deleteModal.confirmLabel')}
                </label>
                <input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('profile.deleteModal.confirmPlaceholder')}
                  aria-label={t('profile.deleteModal.confirmLabel')}
                  className="w-full px-3 py-2.5 bg-paper border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 transition-vintage"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== t('profile.deleteModal.confirmWord') || !deletionInfo}
                  className="flex-1 bg-terracotta text-paper px-4 py-2 rounded-lg text-sm font-body hover:bg-terracotta/90 transition-vintage disabled:opacity-50"
                >
                  {deleting ? t('profile.deleteModal.deleting') : t('profile.deleteModal.deleteButton')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-border text-ink/70 text-sm font-body hover:bg-paper-2/30 transition-vintage disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
