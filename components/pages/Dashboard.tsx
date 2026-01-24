'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../AuthProvider'
import Topbar from '../layout/Topbar'
import VintageCard from '../ui/VintageCard'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'

interface Reminder {
  id: string
  title: string
  due_date: string | null
  category: string
  is_done: boolean
}

export default function Dashboard() {
  const router = useRouter()
  const { familyId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (familyId) {
      loadReminders()
    }
  }, [familyId])

  const loadReminders = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('family_id', familyId!)
      .order('due_date', { ascending: true })
      .limit(5)

    if (data) {
      setReminders(data)
    }
    setLoading(false)
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    await supabase
      .from('reminders')
      .update({ 
        is_done: !isDone,
        done_at: !isDone ? new Date().toISOString() : null
      })
      .eq('id', id)

    loadReminders()
  }

  const getReminderBadgeColor = (reminder: Reminder) => {
    if (reminder.is_done) return 'bg-olive/20 text-olive'
    if (isDueDateOverdue(reminder.due_date, reminder.is_done)) return 'bg-terracotta/20 text-terracotta'
    if (isDueDateToday(reminder.due_date)) return 'bg-olive/20 text-olive'
    return 'bg-ink/10 text-ink'
  }

  const getCategoryColors: Record<string, string> = {
    'Conta': 'bg-terracotta text-white',
    'Casa': 'bg-olive text-white',
    'Sonhos': 'bg-petrol text-white',
    'Família': 'bg-coffee text-white',
    'Outros': 'bg-ink/70 text-white',
  }

  return (
    <>
      <Topbar 
        title="Início" 
        subtitle="Bem-vindo ao seu espaço financeiro familiar"
      />
      <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-paper-2 border-b border-border px-6 py-16 md:py-24">
        {/* Ornament Top */}
        <div className="absolute top-0 left-0 right-0 h-32 opacity-20">
          <svg className="absolute top-4 left-4 w-32 h-32" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#7A8F6B" strokeWidth="0.5" />
            <path d="M 30 50 Q 50 30, 70 50 T 110 50" fill="none" stroke="#7A8F6B" strokeWidth="0.5" />
          </svg>
          <svg className="absolute top-4 right-4 w-32 h-32" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#7A8F6B" strokeWidth="0.5" />
            <path d="M 30 50 Q 50 30, 70 50 T 110 50" fill="none" stroke="#7A8F6B" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Ornament */}
          <svg width="100" height="50" viewBox="0 0 100 50" fill="none" className="mx-auto mb-6">
            <path d="M0 25 Q 25 15, 50 25 T 100 25" stroke="#5A4633" strokeWidth="1" fill="none" />
            <circle cx="50" cy="25" r="4" fill="#5A4633" />
            <path d="M 45 25 L 40 20 M 55 25 L 60 20" stroke="#5A4633" strokeWidth="0.5" />
          </svg>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-coffee mb-6">
            Livro de Finanças da Família – 2026
          </h1>

          <p className="text-lg md:text-xl text-ink/70 italic font-body mb-8 max-w-2xl mx-auto">
            Organizar o dinheiro é cuidar do tempo que ainda vamos viver.
          </p>

          <button
            onClick={() => router.push('/balance')}
            className="bg-coffee text-paper px-8 py-4 rounded-lg font-body text-lg hover:bg-coffee/90 transition-vintage shadow-soft"
          >
            Abrir o livro do mês
          </button>

          {/* Ornament Bottom */}
          <svg width="120" height="30" viewBox="0 0 120 30" fill="none" className="mx-auto mt-8">
            <path d="M0 15 L 120 15" stroke="#D9CFBF" strokeWidth="1" />
            <circle cx="60" cy="15" r="3" fill="#D9CFBF" />
          </svg>
        </div>
      </div>

        {/* Reminders Section */}
      {/*<div className="max-w-7xl mx-auto px-6 py-12">*/}
      {/*  <div className="flex justify-end">*/}
      {/*    <VintageCard className="w-full md:w-96">*/}
      {/*      <div className="flex items-center justify-between mb-4">*/}
      {/*        <div>*/}
      {/*          <h3 className="text-xl font-serif text-coffee">Lembretes da Casa</h3>*/}
      {/*          <p className="text-sm text-ink/60 italic">Pequenas lembranças para um mês mais leve.</p>*/}
      {/*        </div>*/}
      {/*      </div>*/}

      {/*      {loading ? (*/}
      {/*        <div className="text-center py-8 text-ink/60">Carregando...</div>*/}
      {/*      ) : reminders.length === 0 ? (*/}
      {/*        <div className="text-center py-8">*/}
      {/*          <p className="text-ink/60 italic mb-4">Sem lembretes por agora.</p>*/}
      {/*          <p className="text-ink/40 text-sm">Que o mês siga tranquilo.</p>*/}
      {/*        </div>*/}
      {/*      ) : (*/}
      {/*        <div className="space-y-3">*/}
      {/*          {reminders.map((reminder) => (*/}
      {/*            <div*/}
      {/*              key={reminder.id}*/}
      {/*              className={`flex items-start gap-3 p-3 rounded-lg border border-border transition-vintage ${*/}
      {/*                reminder.is_done ? 'opacity-60' : ''*/}
      {/*              }`}*/}
      {/*            >*/}
      {/*              <button*/}
      {/*                onClick={() => toggleDone(reminder.id, reminder.is_done)}*/}
      {/*                className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-vintage ${*/}
      {/*                  reminder.is_done*/}
      {/*                    ? 'bg-olive border-olive'*/}
      {/*                    : 'border-border hover:border-olive'*/}
      {/*                }`}*/}
      {/*              >*/}
      {/*                {reminder.is_done && <Check className="w-4 h-4 text-white" />}*/}
      {/*              </button>*/}

      {/*              <div className="flex-1 min-w-0">*/}
      {/*                <p className={`text-sm font-body ${reminder.is_done ? 'line-through' : ''}`}>*/}
      {/*                  {reminder.title}*/}
      {/*                </p>*/}
      {/*                <div className="flex items-center gap-2 mt-1">*/}
      {/*                  {reminder.due_date && (*/}
      {/*                    <span className={`text-xs px-2 py-0.5 rounded ${getReminderBadgeColor(reminder)}`}>*/}
      {/*                      {formatDate(reminder.due_date, 'dd/MM')}*/}
      {/*                    </span>*/}
      {/*                  )}*/}
      {/*                  <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColors[reminder.category] || getCategoryColors['Outros']}`}>*/}
      {/*                    {reminder.category}*/}
      {/*                  </span>*/}
      {/*                </div>*/}
      {/*              </div>*/}

      {/*              <button className="text-ink/40 hover:text-ink transition-vintage">*/}
      {/*                <MoreVertical className="w-4 h-4" />*/}
      {/*              </button>*/}
      {/*            </div>*/}
      {/*          ))}*/}
      {/*        </div>*/}
      {/*      )}*/}

      {/*      <button className="fixed bottom-6 right-6 w-14 h-14 bg-fab-green text-white rounded-full shadow-vintage flex items-center justify-center hover:bg-fab-green/90 transition-vintage md:absolute md:bottom-4 md:right-4">*/}
      {/*        <Plus className="w-6 h-6" />*/}
      {/*      </button>*/}
      {/*    </VintageCard>*/}
      {/*  </div>*/}
      {/*</div>*/}
      </div>
    </>
  )
}
