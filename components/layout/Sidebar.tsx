'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BanknoteArrowUp, BanknoteArrowDown, PiggyBank, ChartColumnBig, LogOut, Menu, X, Info, Lightbulb, Bell,
  ArrowRightToLine, ArrowLeftToLine
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getSidebarCollapsedStorageKey, LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

/* eslint-disable react-hooks/set-state-in-effect */

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, familyId, user } = useAuth()
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasLoadedCollapsedState, setHasLoadedCollapsedState] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [familyNameLoading, setFamilyNameLoading] = useState(false)
  const [familyNameError, setFamilyNameError] = useState(false)
  const sidebarCollapsed = user?.id ? isCollapsed : false

  const menuItems = [
    { icon: Home, label: t('sidebar.nav.home'), href: '/inicio' },
    { icon: BanknoteArrowUp, label: t('sidebar.nav.expenses'), href: '/expenses' },
    { icon: BanknoteArrowDown, label: t('sidebar.nav.incomes'), href: '/incomes' },
    { icon: PiggyBank, label: t('sidebar.nav.savings'), href: '/savings' },
    { icon: ChartColumnBig, label: t('sidebar.nav.comparatives'), href: '/comparatives' },
    { icon: Bell, label: t('sidebar.nav.reminders'), href: '/reminders' },
    { icon: Lightbulb, label: t('sidebar.nav.insights'), href: '/insights' },
    { icon: Info, label: t('sidebar.nav.about'), href: '/sobre' },
  ]

  const dailyPhrase = useMemo(() => {
    const phrases = t.raw('sidebar.dailyPhrases') as string[]
    const dayIndex = getDayOfYear(new Date()) % phrases.length
    return phrases[dayIndex]
  }, [t])

  useEffect(() => {
    const loadFamilyName = async () => {
      const cachedFamilyName = window.localStorage.getItem(LOCAL_STORAGE_KEYS.familyName)
      if (cachedFamilyName) {
        setFamilyName(cachedFamilyName)
        setFamilyNameLoading(false)
        setFamilyNameError(false)
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
        setFamilyNameLoading(false)
        setFamilyNameError(false)
        return
      }

      setFamilyNameLoading(true)
      setFamilyNameError(false)

      const { data: familyRow, error } = await supabase
        .from('families')
        .select('name')
        .eq('id', effectiveFamilyId)
        .maybeSingle()

      if (error) {
        setFamilyNameError(true)
        setFamilyNameLoading(false)
        return
      }

      let resolvedFamilyName = familyRow?.name ?? ''

      if (familyRow?.name) {
        setFamilyName(familyRow.name)
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, familyRow.name)
      } else {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token

        if (sessionError || !token) {
          setFamilyName('')
          setFamilyNameLoading(false)
          return
        }

        const response = await fetch('/api/families/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          setFamilyName('')
          setFamilyNameLoading(false)
          return
        }

        const payload = await response.json().catch(() => ({}))
        resolvedFamilyName = payload?.familyName || ''
        setFamilyName(resolvedFamilyName)
        if (resolvedFamilyName) {
          window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, resolvedFamilyName)
        } else {
          window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
        }
      }

      setFamilyNameLoading(false)
    }

    loadFamilyName()
  }, [familyId, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const scopedStorageKey = getSidebarCollapsedStorageKey(user.id)
    const storedState = window.localStorage.getItem(scopedStorageKey)
    const legacyStoredState = window.localStorage.getItem(LOCAL_STORAGE_KEYS.sidebarCollapsed)

    if (storedState !== null) {
      setIsCollapsed(storedState === 'true')
    } else if (legacyStoredState !== null) {
      const nextState = legacyStoredState === 'true'
      setIsCollapsed(nextState)
      window.localStorage.setItem(scopedStorageKey, String(nextState))
    } else {
      setIsCollapsed(false)
    }

    setHasLoadedCollapsedState(true)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !hasLoadedCollapsedState) return

    document.documentElement.dataset.sidebarCollapsed = isCollapsed ? 'true' : 'false'
    window.localStorage.setItem(getSidebarCollapsedStorageKey(user.id), String(isCollapsed))
  }, [hasLoadedCollapsedState, isCollapsed, user?.id])

  const sidebarContent = (
    <>
      <div className={`border-b border-white/10 bg-sidebar ${sidebarCollapsed ? 'p-4' : 'p-6'}`}>
        <div className={`flex ${sidebarCollapsed ? 'flex-col items-center' : 'items-center gap-3'}`}>
          <Image src="/logo.png" alt="Logo Florim" width={56} height={56} className={`${sidebarCollapsed ? 'w-12 h-12' : 'w-14 h-14'} object-contain`} />
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-white font-serif text-lg">{t('sidebar.family')}</h2>
              <p className="text-white/70 text-sm">
                {familyNameError ? t('sidebar.loadError') : familyNameLoading ? t('sidebar.loading') : familyName || t('sidebar.noName')}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href} className="relative">
                {isActive && !sidebarCollapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[2.5px] bg-gold rounded-r" />
                )}
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`
                    group flex items-center rounded-lg transition-vintage
                    ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
                    ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="font-ptSerif| text-sm">{item.label}</span>}
                  {sidebarCollapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-paper px-2 py-1 text-xs text-ink shadow-vintage opacity-0 group-hover:opacity-100 transition-vintage z-50">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {!sidebarCollapsed && (
        <div className="px-8 pb-10">
          <p className="text-[13px] italic text-gold">
            {dailyPhrase}
          </p>
        </div>
      )}

      <div className={`border-t border-white/10 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`
            hidden md:flex items-center rounded-lg transition-vintage text-white/80 hover:bg-white/10 hover:text-white mb-2
            ${sidebarCollapsed ? 'justify-center w-full px-2 py-3' : 'gap-3 px-4 py-3 w-full'}
          `}
          title={sidebarCollapsed ? t('sidebar.expand') : undefined}
          aria-label={sidebarCollapsed ? t('sidebar.expandLabel') : t('sidebar.collapseLabel')}
        >
          {sidebarCollapsed ? <ArrowRightToLine className="w-5 h-5" /> : <ArrowLeftToLine className="w-5 h-5" />}
          {!sidebarCollapsed && <span className="font-body text-sm">{t('sidebar.collapse')}</span>}
        </button>
        <button
          type="button"
          onClick={() => {
            signOut()
            setIsOpen(false)
          }}
          title={sidebarCollapsed ? t('sidebar.signOut') : undefined}
          className={`
            group flex items-center w-full text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-vintage
            ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && <span className="font-body text-sm">{t('sidebar.signOut')}</span>}
          {sidebarCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-paper px-2 py-1 text-xs text-ink shadow-vintage opacity-0 group-hover:opacity-100 transition-vintage z-50">
              {t('sidebar.signOut')}
            </span>
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button - hidden since BottomNav handles navigation */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 hidden w-10 h-10 bg-sidebar rounded-lg flex items-center justify-center text-white shadow-vintage"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen bg-sidebar flex flex-col z-40
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        ${sidebarCollapsed ? 'md:w-20' : 'md:w-72'} w-72
      `}>
        {sidebarContent}
      </aside>
    </>
  )
}
