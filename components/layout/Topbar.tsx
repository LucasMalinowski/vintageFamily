'use client'

import { Bell, BanknoteArrowDown, BanknoteArrowUp, ChartColumnBig, ChevronDown, Home, Info, PiggyBank, Search, Settings, User } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { getAuthBearerToken } from '@/lib/billing/client'

const PAGE_ICONS: Record<string, React.ElementType> = {
  '/inicio': Home,
  '/payables': BanknoteArrowUp,
  '/receivables': BanknoteArrowDown,
  '/dreams': PiggyBank,
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
}

export default function Topbar({
  title,
  subtitle,
  actions,
  filters,
  variant = 'default',
  titleClassName = '',
  subtitleClassName = '',
}: TopbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, familyId } = useAuth()
  const PageIcon = PAGE_ICONS[pathname] ?? null
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
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
    <div className={`${variant === 'textured' ? 'bg-paper' : 'bg-bg'} px-6 py-5.5 pl-16 md:pl-6`}>
      <div className={`${filters ? 'flex flex-col gap-2' : ''}`}>
        <div className="min-h-[103px] flex items-center">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
            <div className="flex items-center gap-3 min-w-0">
              {PageIcon && (
                <div className="w-[34px] h-[34px] rounded-[9px] bg-coffee/[0.09] flex items-center justify-center text-coffee shrink-0">
                  <PageIcon className="w-[17px] h-[17px]" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className={`text-3xl font-serif text-coffee mb-1 ${titleClassName}`}>{title}</h1>
                {subtitle && (
                  <p className={`text-sm text-ink/70 font-body ${subtitleClassName}`}>{subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 sm:gap-4 md:self-start md:-mt-1">
              {actions && <div className="w-full md:w-auto">{actions}</div>}
              {trialDaysLeft !== null && trialDaysLeft > 0 && (
                <div className="rounded-full border border-coffee/20 bg-paper px-3 py-1 text-xs font-semibold text-coffee">
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
              <button className="hidden sm:inline-flex text-coffee hover:text-coffee/80 transition-vintage" aria-label="Buscar">
                <Search className="w-6 h-6" />
              </button>
              <button
                onClick={() => router.push('/settings')}
                className="hidden sm:inline-flex text-coffee hover:text-coffee/80 transition-vintage"
                aria-label="Abrir configurações"
              >
                <Settings className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 text-sm bg-sidebar text-paper pl-4 pr-6 py-4 -mr-6 -mt-5 -mb-4 rounded-none">
                <div className="w-8 h-8 rounded-full bg-paper text-paper flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-paper" />
                  )}
                </div>
                <span className="hidden md:inline text-paper font-ptSerif">
                  {userName ? `${userName}` : ''}
                </span>
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
    </div>
  )
}
