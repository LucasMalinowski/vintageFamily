'use client'

import { Bell, BanknoteArrowDown, BanknoteArrowUp, ChartColumnBig, ChevronDown, ChevronLeft, Home, Info, PiggyBank, Settings } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState } from 'react'
import { getAuthBearerToken } from '@/lib/billing/client'
import ProfileSheet from '@/components/layout/ProfileSheet'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'

const PAGE_ICONS: Record<string, React.ElementType> = {
  '/inicio': Home,
  '/expenses': BanknoteArrowUp,
  '/incomes': BanknoteArrowDown,
  '/savings': PiggyBank,
  '/comparatives': ChartColumnBig,
  '/sobre': Info,
}

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  filters?: React.ReactNode
  variant?: 'default' | 'textured'
  titleClassName?: string
  subtitleClassName?: string
  showBackButton?: boolean
}

export default function Topbar({
  title,
  subtitle,
  actions,
  filters,
  variant = 'default',
  titleClassName = '',
  subtitleClassName = '',
  showBackButton = false,
}: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, familyId } = useAuth()
  const PageIcon = showBackButton ? null : (PAGE_ICONS[pathname] ?? null)
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const totalTrialDays = 15

  useEffect(() => {
    const loadHeaderData = async () => {
      if (!user) return
      const { data: userRow } = await supabase
        .from('users')
        .select('name,avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (userRow?.name) {
        setUserName(userRow.name)
      }
      if (userRow?.avatar_url) {
        setAvatarUrl(userRow.avatar_url)
      }
    }

    loadHeaderData()
  }, [user])

  useEffect(() => {
    const loadFamilyName = async () => {
      if (typeof window === 'undefined') return

      const cachedFamilyName = window.localStorage.getItem(LOCAL_STORAGE_KEYS.familyName)
      if (cachedFamilyName) {
        setFamilyName(cachedFamilyName)
        return
      }

      let effectiveFamilyId = familyId

      if (!effectiveFamilyId && user?.id) {
        const { data: profileRow } = await supabase
          .from('users')
          .select('family_id')
          .eq('id', user.id)
          .maybeSingle()

        if (profileRow?.family_id) {
          effectiveFamilyId = profileRow.family_id
        }
      }

      if (!effectiveFamilyId) {
        setFamilyName('')
        window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
        return
      }

      const { data: familyRow } = await supabase
        .from('families')
        .select('name')
        .eq('id', effectiveFamilyId)
        .maybeSingle()

      let resolvedFamilyName = familyRow?.name ?? ''

      if (!resolvedFamilyName) {
        const token = await getAuthBearerToken()
        if (token) {
          const response = await fetch('/api/families/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const payload = await response.json().catch(() => ({}))
            resolvedFamilyName = payload?.familyName || ''
          }
        }
      }

      setFamilyName(resolvedFamilyName)
      if (resolvedFamilyName) {
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, resolvedFamilyName)
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
      }
    }

    loadFamilyName()
  }, [familyId, user?.id])

  useEffect(() => {
    const loadTrialStatus = async () => {
      if (!familyId) return

      const token = await getAuthBearerToken()
      if (!token) {
        setTrialDaysLeft(null)
        return
      }

      const response = await fetch('/api/billing/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json().catch(() => null)

      const access = payload?.access

      if (
        !response.ok ||
        !access?.trialExpiresAt ||
        !access?.hasActiveTrial ||
        access?.hasValidSubscription ||
        access?.hasLifetimeAccess
      ) {
        setTrialDaysLeft(null)
        return
      }

      const expiresAt = new Date(access.trialExpiresAt)
      const diffMs = expiresAt.getTime() - Date.now()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      setTrialDaysLeft(Math.max(daysLeft, 0))
    }

    loadTrialStatus()
  }, [familyId])

  return (
    <div className={`${variant === 'textured' ? 'bg-paper' : 'bg-bg'} px-4 py-3 md:px-6 md:py-5.5`}>
      <div className={`${filters ? 'flex flex-col gap-2' : ''}`}>
        <div className="md:min-h-[103px] flex items-center">
          <div className="flex flex-row items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {showBackButton ? (
                <button
                  onClick={() => router.back()}
                  className="w-[34px] h-[34px] rounded-[9px] bg-coffee/[0.09] flex items-center justify-center text-coffee shrink-0 hover:bg-coffee/[0.15] transition-vintage"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="w-[20px] h-[20px]" />
                </button>
              ) : PageIcon ? (
                <div className="w-[34px] h-[34px] rounded-[9px] bg-coffee/[0.09] flex items-center justify-center text-coffee shrink-0">
                  <PageIcon className="w-[17px] h-[17px]" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className={`text-xl md:text-3xl font-serif text-coffee leading-tight mb-0.5 md:mb-1 ${titleClassName}`}>{title}</h1>
                {subtitle && (
                  <p className={`text-xs md:text-sm text-ink/70 font-body ${subtitleClassName}`}>{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0 md:self-start md:-mt-1">
              {actions && <div>{actions}</div>}
              {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <div className="hidden md:flex rounded-full border border-coffee/20 bg-paper px-3 py-1 text-xs font-semibold text-coffee">
                  {trialDaysLeft} dias de teste restantes
                </div>
              )}
              <button
                onClick={() => router.push('/reminders')}
                className="text-coffee hover:text-coffee/80 transition-vintage"
                aria-label="Abrir lembretes"
              >
                <Bell className="w-6 h-6" />
              </button>

              {/* Mobile avatar — opens ProfileSheet */}
              <button
                onClick={() => setProfileSheetOpen(true)}
                className="flex md:hidden w-8 h-8 rounded-full bg-[#B05C3A] items-center justify-center shrink-0"
                aria-label="Abrir perfil"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-white leading-none">
                    {userName
                      ? userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                      : 'U'}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="hidden sm:inline-flex text-coffee hover:text-coffee/80 transition-vintage"
                aria-label="Abrir configurações"
              >
                <Settings className="w-6 h-6" />
              </button>
              {/* Divider */}
              <span className="hidden sm:block w-px h-6 bg-border" />

              {/* Avatar pill + dropdown */}
              <div ref={profileRef} className="hidden sm:block relative">
                <button
                  onClick={() => setProfileOpen(prev => !prev)}
                  className="flex items-center gap-2 border border-border rounded-full py-1 pl-1 pr-3 hover:bg-paper transition-vintage"
                  aria-label="Abrir perfil"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-[#B05C3A]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-white leading-none">
                        {userName
                          ? userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
                          : 'U'}
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] text-ink hidden md:inline">
                    {userName ? userName.split(' ')[0] : ''}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-ink/50 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-paper shadow-lg z-50 py-1 overflow-hidden">
                    {[
                      { label: 'Perfil', href: '/settings/profile' },
                      { label: 'Família', href: '/settings/family' },
                      { label: 'Assinatura', href: '/settings/billing' },
                    ].map(({ label, href }) => (
                      <button
                        key={href}
                        onClick={() => { setProfileOpen(false); router.push(href) }}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-bg transition-vintage"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>        
        </div>

        {filters && (
          <div className="mb-6 rounded-[20px] border px-4 py-2 bg-bg">
            <div className="flex items-center justify-between md:hidden mb-3">
              <span className="text-xs uppercase tracking-wide text-ink/50">Filtros</span>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="text-petrol hover:text-petrol/80 transition-vintage"
                aria-label="Alternar filtros"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            <div className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
              {filters}
            </div>
          </div>
        )}
      </div>

      <ProfileSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        userName={userName}
        familyName={familyName}
      />
    </div>
  )
}
