'use client'

import { Bell, Search, Settings, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  variant?: 'default' | 'textured'
}

export default function Topbar({ title, subtitle, actions, variant = 'default' }: TopbarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [userName, setUserName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

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

  return (
    <div className={`${variant === 'textured' ? 'bg-texture' : 'bg-paper-2'} px-6 py-4 pl-16 md:pl-6`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-serif text-coffee mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-ink/70 font-body">{subtitle}</p>
          )}
        </div>

        <div className="flex items-start gap-3 sm:gap-4 md:self-start md:-mt-1">
          {actions && <div className="w-full md:w-auto">{actions}</div>}
          <button
            onClick={() => router.push('/reminders')}
            className="text-coffee hover:text-coffee/80 transition-vintage mt-1"
            aria-label="Abrir lembretes"
          >
            <Bell className="w-6 h-6" />
          </button>
          <button className="hidden sm:inline-flex text-coffee hover:text-coffee/80 transition-vintage mt-1" aria-label="Buscar">
            <Search className="w-6 h-6" />
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="hidden sm:inline-flex text-coffee hover:text-coffee/80 transition-vintage mt-1"
            aria-label="Abrir configurações"
          >
            <Settings className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 text-sm bg-sidebar text-paper pl-4 pr-6 py-4 -mr-6 -mt-4 -mb-4 rounded-none">
            <div className="w-8 h-8 rounded-full bg-paper/20 text-paper flex items-center justify-center overflow-hidden">
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
  )
}
