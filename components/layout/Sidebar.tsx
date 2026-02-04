'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BanknoteArrowUp, BanknoteArrowDown, PiggyBank, ChartColumnBig, LogOut, Menu, X, Info } from 'lucide-react'
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
  const { signOut, familyId } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const dailyPhrase = useMemo(() => {
    const dayIndex = getDayOfYear(new Date()) % dailyPhrases.length
    return dailyPhrases[dayIndex]
  }, [])

  useEffect(() => {
    const loadFamilyName = async () => {
      if (!familyId) return
      const { data: familyRow } = await supabase
        .from('families')
        .select('name')
        .eq('id', familyId)
        .maybeSingle()

      if (familyRow?.name) {
        setFamilyName(familyRow.name)
      }
    }

    loadFamilyName()
  }, [familyId])

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/10 bg-[url('/texture-green.png')] bg-cover bg-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo Florim" className="w-14 h-14 object-contain" />
          <div>
            <h2 className="text-white font-serif text-lg">Família</h2>
            <p className="text-white/70 text-sm">{familyName || 'Carregando...'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-vintage
                    ${isActive 
                      ? 'bg-white/15 text-white shadow-soft' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-ptSerif| text-sm">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-8 pb-10">
        <p className="text-[13px] italic text-gold">
          {dailyPhrase}
        </p>
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => {
            signOut()
            setIsOpen(false)
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-vintage"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-body text-sm">Sair</span>
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
        w-72
      `}>
        <SidebarContent />
      </aside>
    </>
  )
}
