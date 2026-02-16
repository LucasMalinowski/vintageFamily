'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, BanknoteArrowUp, BanknoteArrowDown, PiggyBank, ChartColumnBig, LogOut, Menu, X, Info,
  ArrowRightToLine, ArrowLeftToLine
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useMemo, useState } from 'react'

const menuItems = [
  { icon: Home, label: 'Início', href: '/inicio' },
  { icon: BanknoteArrowUp, label: 'Contas a Pagar', href: '/payables' },
  { icon: BanknoteArrowDown, label: 'Contas a Receber', href: '/receivables' },
  { icon: PiggyBank, label: 'Poupança', href: '/dreams' },
  { icon: ChartColumnBig, label: 'Dashboard', href: '/comparatives' },
  { icon: Info, label: 'Sobre', href: '/about' },
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
  const [familyName, setFamilyName] = useState('')
  const [familyNameLoading, setFamilyNameLoading] = useState(false)
  const [familyNameError, setFamilyNameError] = useState(false)
  const dailyPhrase = useMemo(() => {
    const dayIndex = getDayOfYear(new Date()) % dailyPhrases.length
    return dailyPhrases[dayIndex]
  }, [])

  useEffect(() => {
    const loadFamilyName = async () => {
      let effectiveFamilyId = familyId

      if (!effectiveFamilyId && user?.id) {
        const { data: profileRow, error: profileError } = await supabase
          .from('users')
          .select('family_id')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Sidebar user profile query failed:', profileError)
        }

        if (profileRow?.family_id) {
          effectiveFamilyId = profileRow.family_id
        }
      }

      if (!effectiveFamilyId) {
        setFamilyName('')
        setFamilyNameLoading(false)
        setFamilyNameError(false)
        if (process.env.NODE_ENV !== 'production') {
          console.info('Sidebar family name skipped: missing family id')
        }
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
        console.error('Sidebar family name query failed:', error)
        setFamilyNameError(true)
        setFamilyNameLoading(false)
        return
      }

      let resolvedFamilyName = familyRow?.name ?? ''

      if (familyRow?.name) {
        setFamilyName(familyRow.name)
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
      }

      if (process.env.NODE_ENV !== 'production') {
        console.info('Sidebar family name loaded:', { familyId: effectiveFamilyId, familyName: resolvedFamilyName || null })
      }

      setFamilyNameLoading(false)
    }

    loadFamilyName()
  }, [familyId, user?.id])

  useEffect(() => {
    const storedState = window.localStorage.getItem('sidebar-collapsed')
    if (storedState) {
      setIsCollapsed(storedState === 'true')
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = isCollapsed ? 'true' : 'false'
    window.localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const SidebarContent = () => (
    <>
      <div className={`border-b border-white/10 bg-[url('/texture-green.png')] bg-cover bg-center ${isCollapsed ? 'p-4' : 'p-6'}`}>
        <div className={`flex ${isCollapsed ? 'flex-col items-center' : 'items-center gap-3'}`}>
          <img src="/logo.png" alt="Logo Florim" className={`${isCollapsed ? 'w-12 h-12' : 'w-14 h-14'} object-contain`} />
          {!isCollapsed && (
            <div>
              <h2 className="text-white font-serif text-lg">Família</h2>
              <p className="text-white/70 text-sm">
                {familyNameError ? 'Falha ao carregar' : familyNameLoading ? 'Carregando...' : familyName || 'Sem nome'}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    group flex items-center rounded-lg transition-vintage
                    ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
                    ${isActive 
                      ? 'bg-white/15 text-white shadow-soft' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="font-ptSerif| text-sm">{item.label}</span>}
                  {isCollapsed && (
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

      {!isCollapsed && (
        <div className="px-8 pb-10">
          <p className="text-[13px] italic text-gold">
            {dailyPhrase}
          </p>
        </div>
      )}

      <div className={`border-t border-white/10 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`
            hidden md:flex items-center rounded-lg transition-vintage text-white/80 hover:bg-white/10 hover:text-white mb-2
            ${isCollapsed ? 'justify-center w-full px-2 py-3' : 'gap-3 px-4 py-3 w-full'}
          `}
          title={isCollapsed ? 'Expandir menu' : undefined}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isCollapsed ? <ArrowRightToLine className="w-5 h-5" /> : <ArrowLeftToLine className="w-5 h-5" />}
          {!isCollapsed && <span className="font-body text-sm">Recolher menu</span>}
        </button>
        <button
          onClick={() => {
            signOut()
            setIsOpen(false)
          }}
          title={isCollapsed ? 'Sair' : undefined}
          className={`
            group flex items-center w-full text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-vintage
            ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'}
          `}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-body text-sm">Sair</span>}
          {isCollapsed && (
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
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-sidebar rounded-lg flex items-center justify-center text-white shadow-vintage"
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
        ${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72
      `}>
        <SidebarContent />
      </aside>
    </>
  )
}
