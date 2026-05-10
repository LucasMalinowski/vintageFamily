'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, User, Info, Bell, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
  userName?: string
  familyName?: string
}

const menuItems = [
  { icon: User, label: 'Meu perfil', subtitle: 'Dados pessoais e familia', href: '/settings/profile' },
  { icon: Info, label: 'Sobre o Florim', subtitle: 'A história e o propósito', href: '/sobre' },
  { icon: Bell, label: 'Lembretes', subtitle: 'Lembretes da casa', href: '/reminders' },
  { icon: Settings, label: 'Configurações', subtitle: 'Preferências da conta', href: '/settings' },
]

export default function ProfileSheet({ open, onClose, userName = '', familyName = '' }: ProfileSheetProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (familyName) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, familyName)
      }
    }
  }, [familyName])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = setTimeout(() => setAnimated(true), 10)
      return () => clearTimeout(t)
    } else {
      setAnimated(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  const handleNav = (href: string) => {
    onClose()
    router.push(href)
  }

  const handleSignOut = async () => {
    onClose()
    await signOut()
  }

  if (!mounted) return null

  return (
    <div className="md:hidden">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/38 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          animated ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-offWhite rounded-t-[22px] flex flex-col transition-transform duration-300 ${
          animated ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 rounded-full bg-ink/20 mx-auto mt-3 mb-2 shrink-0" />

        {/* User header */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-[52px] h-[52px] rounded-full bg-[#B05C3A] flex items-center justify-center shrink-0">
            <span className="text-[18px] font-bold text-white leading-none">
              {initials || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink truncate">{userName || 'Usuário'}</p>
            <p className="text-sm text-ink/50 truncate">
              Família {familyName || '—'}
            </p>
          </div>
        </div>

        <div className="h-px bg-border mx-5" />

        {/* Menu items */}
        <div className="py-2">
          {menuItems.map(({ icon: Icon, label, subtitle, href }) => (
            <button
              key={`${label}-${href}`}
              onClick={() => handleNav(href)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-ink hover:bg-paper transition-vintage"
            >
              <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-ink/55" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-ink/45">{subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink/25 shrink-0" />
            </button>
          ))}
        </div>

        <div className="h-px bg-border mx-5" />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-terracotta hover:bg-paper transition-vintage"
        >
          <div className="w-9 h-9 rounded-[10px] bg-terracotta/[0.08] flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-terracotta shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-terracotta">Sair</p>
            <p className="text-xs text-terracotta/60">Encerrar sessão</p>
          </div>
        </button>
      </div>
    </div>
  )
}
