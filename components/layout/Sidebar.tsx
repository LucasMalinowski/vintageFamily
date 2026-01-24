'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Receipt, DollarSign, Lightbulb, PiggyBank, TrendingUp, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: Receipt, label: 'Contas a Pagar', href: '/payables' },
  { icon: DollarSign, label: 'Contas a Receber', href: '/receivables' },
  { icon: Lightbulb, label: 'Poupança / Sonhos', href: '/dreams' },
  { icon: PiggyBank, label: 'Saldo', href: '/balance' },
  { icon: TrendingUp, label: 'Comparativos', href: '/comparatives' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, familyId } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [familyName, setFamilyName] = useState('')

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
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
            <img src="/logo1.png" alt="Logo" className="w-24 h-24 object-contain" />
            {/*<img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />*/}
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
                      ? 'bg-white/20 text-white' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-body text-sm">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

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
