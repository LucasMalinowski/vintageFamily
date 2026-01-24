'use client'

import { Bell, Search, User } from 'lucide-react'
import { getCurrentMonth, getCurrentYear, MONTHS } from '@/lib/dates'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  const currentMonth = MONTHS[getCurrentMonth() - 1]?.label
  const currentYear = getCurrentYear()
  const router = useRouter()
  const { user, familyId } = useAuth()
  const [userName, setUserName] = useState('')
  const [familyName, setFamilyName] = useState('')
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

  return (
    <div className="bg-paper-2 border-b border-border px-6 py-4">
      {/* Top row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-sm text-ink/70">
          <span>Família {familyName || ''}</span>
          <span className="text-ink/40">•</span>
          <span>{currentYear}</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-ink/70 hover:text-ink transition-vintage">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-ink/70 hover:text-ink transition-vintage">
            <Search className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink/70">
              Bem-vindo{userName ? `, ${userName}` : ''}
            </span>
            <button
              onClick={() => router.push('/settings/profile')}
              className="w-8 h-8 rounded-full bg-coffee/20 flex items-center justify-center"
              aria-label="Abrir configurações"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-coffee" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-coffee mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-ink/60 italic font-body">{subtitle}</p>
          )}
        </div>

        {actions && <div>{actions}</div>}
      </div>
    </div>
  )
}
