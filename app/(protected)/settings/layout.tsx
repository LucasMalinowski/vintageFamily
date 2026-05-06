'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

const settingsItems = [
  { label: 'Perfil', href: '/settings/profile' },
  { label: 'Família', href: '/settings/family' },
  { label: 'Assinatura', href: '/settings/billing' },
  { label: 'Insights', href: '/settings/insights' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const loadRole = async () => {
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('super_admin')
        .eq('id', user.id)
        .maybeSingle()

      setIsSuperAdmin(Boolean(data?.super_admin))
    }

    loadRole()
  }, [user])

  const visibleItems = isSuperAdmin
    ? [
        ...settingsItems,
        { label: 'Superadministrador', href: '/settings/admin' },
        { label: 'Feedbacks', href: '/settings/admin/feedback' },
      ]
    : settingsItems

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-paper">
        <Topbar
          title="Configurações"
          subtitle="Gerencie sua conta e família."
          showBackButton
        />

        <div className="flex flex-1 min-h-0">
          <aside className="hidden md:flex flex-col w-[200px] border-r border-border bg-bg shrink-0 py-5 px-4">
            <nav>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-[14px] py-[10px] rounded-lg text-sm mb-1 transition-vintage border-l-[2.5px] ${
                      isActive
                        ? 'bg-coffee/[0.08] text-coffee font-semibold border-gold'
                        : 'text-ink border-transparent hover:bg-coffee/[0.06]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <section className="flex-1 overflow-y-auto p-6 md:p-8">
            {/* Mobile nav tabs */}
            <div className="md:hidden flex gap-1 mb-4 border-b border-border pb-3 overflow-x-auto">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm transition-vintage border-b-2 ${
                      isActive
                        ? 'text-coffee font-semibold border-gold'
                        : 'text-ink border-transparent hover:bg-coffee/[0.06]'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
            {children}
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
