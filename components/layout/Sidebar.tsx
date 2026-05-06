'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BanknoteArrowUp, BanknoteArrowDown, PiggyBank, ChartColumnBig, LogOut, Menu, X, Info, Lightbulb,
  ArrowRightToLine, ArrowLeftToLine
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getSidebarCollapsedStorageKey, LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { useEffect, useMemo, useState } from 'react'

/* eslint-disable react-hooks/set-state-in-effect */

const menuItems = [
  { icon: Home, label: 'Início', href: '/inicio' },
  { icon: BanknoteArrowUp, label: 'Contas a Pagar', href: '/expenses' },
  { icon: BanknoteArrowDown, label: 'Contas a Receber', href: '/incomes' },
  { icon: PiggyBank, label: 'Poupança', href: '/savings' },
  { icon: ChartColumnBig, label: 'Comparativos', href: '/comparatives' },
  { icon: Lightbulb, label: 'Insights', href: '/insights' },
  { icon: Info, label: 'Sobre', href: '/sobre' },
]

const dailyPhrases = [
  'Cuidar do dinheiro da casa é cuidar do tempo juntos.',
  'Cada pequena economia vira calma no coração da família.',
  'Planejar as contas é abrir espaço para os abraços.',
  'Nossa mesa fica mais leve quando o orçamento é claro.',
  'Guardar um pouco hoje é proteger o amanhã de quem amamos.',
  'Conversar sobre gastos é um ato de cuidado.',
  'A tranquilidade financeira começa com união.',
  'Quando a casa se organiza, o amor respira melhor.',
  'O dinheiro bem cuidado vira tempo de qualidade.',
  'Sonhos de família cabem quando caminhamos juntos.',
  'Equilíbrio nas contas, harmonia no lar.',
  'O orçamento é o mapa da nossa paz.',
  'Cada escolha consciente fortalece nossa casa.',
  'A segurança da família nasce de pequenos combinados.',
  'Organizar o mês é guardar carinho para os dias difíceis.',
  'O cuidado financeiro é uma forma de dizer "estou aqui".',
  'Dividir responsabilidades é multiplicar confiança.',
  'Combinados claros evitam preocupações desnecessárias.',
  'O futuro da família se constrói com gentileza e atenção.',
  'Poupança é um abraço longo no amanhã.',
  'Uma casa bem cuidada começa na conversa.',
  'Priorizar juntos é proteger o que importa.',
  'Economizar sem culpa é escolher o que traz paz.',
  'Planejar é permitir que os sonhos encontrem lugar.',
  'A leveza do lar vem da transparência.',
  'Dinheiro alinhado, coração tranquilo.',
  'Cuidar das contas é cuidar das pessoas.',
  'Todo mês organizado deixa espaço para o afeto.',
  'O amor também mora nos detalhes do orçamento.',
  'Juntos, o que parecia pesado fica possível.',
]

const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, familyId, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasLoadedCollapsedState, setHasLoadedCollapsedState] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [familyNameLoading, setFamilyNameLoading] = useState(false)
  const [familyNameError, setFamilyNameError] = useState(false)
  const sidebarCollapsed = user?.id ? isCollapsed : false
  const dailyPhrase = useMemo(() => {
    const dayIndex = getDayOfYear(new Date()) % dailyPhrases.length
    return dailyPhrases[dayIndex]
  }, [])

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
          <img src="/logo.png" alt="Logo Florim" className={`${sidebarCollapsed ? 'w-12 h-12' : 'w-14 h-14'} object-contain`} />
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-white font-serif text-lg">Família</h2>
              <p className="text-white/70 text-sm">
                {familyNameError ? 'Falha ao carregar' : familyNameLoading ? 'Carregando...' : familyName || 'Sem nome'}
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
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`
            hidden md:flex items-center rounded-lg transition-vintage text-white/80 hover:bg-white/10 hover:text-white mb-2
            ${sidebarCollapsed ? 'justify-center w-full px-2 py-3' : 'gap-3 px-4 py-3 w-full'}
          `}
          title={sidebarCollapsed ? 'Expandir menu' : undefined}
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {sidebarCollapsed ? <ArrowRightToLine className="w-5 h-5" /> : <ArrowLeftToLine className="w-5 h-5" />}
          {!sidebarCollapsed && <span className="font-body text-sm">Recolher menu</span>}
        </button>
        <button
          onClick={() => {
            signOut()
            setIsOpen(false)
          }}
          title={sidebarCollapsed ? 'Sair' : undefined}
          className={`
            group flex items-center w-full text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-vintage
            ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!sidebarCollapsed && <span className="font-body text-sm">Sair</span>}
          {sidebarCollapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-paper px-2 py-1 text-xs text-ink shadow-vintage opacity-0 group-hover:opacity-100 transition-vintage z-50">
              Sair
            </span>
          )}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button — hidden since BottomNav handles navigation */}
      <button
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
