'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'

const settingsItems = [
  { label: 'Perfil', href: '/settings/profile' },
  { label: 'Familia', href: '/settings/family' },
  { label: 'Assinatura', href: '/settings/billing' },
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
    ? [...settingsItems, { label: 'Super Admin', href: '/settings/admin' }]
    : settingsItems

  return (
    <AppLayout>
      <div className="min-h-screen bg-paper">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            <aside className="md:w-64 bg-bg border border-border rounded-vintage shadow-vintage">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-lg font-serif text-coffee">Configurações</h2>
                <p className="text-sm text-ink/60 font-body">Sua família e perfil</p>
              </div>
              <nav className="p-3">
                <ul className="space-y-2">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block px-4 py-2 rounded-lg text-sm font-body transition-vintage ${
                            isActive
                              ? 'bg-coffee text-paper'
                              : 'text-ink/70 hover:text-ink hover:bg-paper'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </aside>

            <section className="flex-1">{children}</section>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
