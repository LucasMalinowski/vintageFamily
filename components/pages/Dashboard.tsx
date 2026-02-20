'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../AuthProvider'
import Topbar from '../layout/Topbar'
import VintageCard from '../ui/VintageCard'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'

interface Reminder {
  id: string
  title: string
  due_date: string | null
  category: string
  is_done: boolean
}

interface Payable {
  id: string
  description: string
  date: string
  category_name: string
}

export default function Dashboard() {
  const { familyId, user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [pendingPayables, setPendingPayables] = useState<Payable[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPayables, setLoadingPayables] = useState(true)
  const [familyName, setFamilyName] = useState('')
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [reminderForm, setReminderForm] = useState({
    title: '',
    due_date: '',
    category: 'Outros',
  })

  useEffect(() => {
    if (familyId) {
      loadReminders()
      loadPendingPayables()
    }
    loadFamilyName()
  }, [familyId, user?.id])

  const loadReminders = async () => {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('family_id', familyId!)
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true })
      .limit(5)

    if (data) {
      setReminders(data)
    }
    setLoading(false)
  }

  const loadPendingPayables = async () => {
    const { data } = await supabase
      .from('expenses')
      .select('id,description,date,category_name')
      .eq('family_id', familyId!)
      .eq('status', 'open')
      .order('date', { ascending: true })
      .limit(5)

    if (data) {
      setPendingPayables(data)
    }
    setLoadingPayables(false)
  }

  const loadFamilyName = async () => {
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
      return
    }

    const { data: familyRow } = await supabase
      .from('families')
      .select('name')
      .eq('id', effectiveFamilyId)
      .maybeSingle()

    if (familyRow?.name) {
      setFamilyName(familyRow.name)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    const response = await fetch('/api/families/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return

    const payload = await response.json().catch(() => ({}))
    setFamilyName(payload?.familyName || '')
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    await supabase
      .from('reminders')
      .update({ 
        is_done: !isDone,
        done_at: !isDone ? new Date().toISOString() : null
      })
      .eq('id', id)

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, is_done: !isDone } : reminder
      )
    )
  }

  const handleCreateReminder = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!familyId) return
    if (!reminderForm.title.trim()) return

    await supabase.from('reminders').insert({
      family_id: familyId,
      title: reminderForm.title.trim(),
      due_date: reminderForm.due_date || null,
      category: reminderForm.category || 'Outros',
      recurrence: 'none',
      is_done: false,
      note: null,
      due_time: null,
    })

    setReminderForm({ title: '', due_date: '', category: 'Outros' })
    setIsReminderModalOpen(false)
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
        variant="textured"
      />
      <div className="min-h-screen bg-texture">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-[linear-gradient(rgba(47,59,51,0.35),rgba(47,59,51,0.35)),url('/flowers.png')] bg-cover bg-center border border-border/70 rounded-lg p-10 shadow-soft text-center text-paper">
            <h1 className="text-3xl md:text-4xl  font-serif text-paper">
              Livro de Finanças da<br/> Família {familyName || '—'}
            </h1>
          </div>
          <div className="mt-6">
            <div className="max-w-md bg-paper border border-gold/70 px-6 py-4 shadow-soft text-ink/70 font-ptSerif italic">
              Organizar o dinheiro é cuidar do tempo que ainda vamos viver.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <VintageCard className="!bg-paper">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-serif text-gold">Contas pendentes</h3>
                  <p className="text-sm text-ink/60 ">Que a casa siga leve.</p>
                </div>
              </div>

              {loadingPayables ? (
                <div className="text-center py-8 text-ink/60">Carregando...</div>
              ) : pendingPayables.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-ink/60  mb-2">Sem contas pendentes</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {pendingPayables.map((payable) => (
                    <Link
                      key={payable.id}
                      href={`/payables#expense-${payable.id}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-paper transition-vintage"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-body text-ink truncate">{payable.description}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-ink/60">
                          <span>{formatDate(payable.date, 'dd/MM')}</span>
                          <span>•</span>
                          <span>{payable.category_name}</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-gold/20 text-gold">
                        Em aberto
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="pt-3">
                <Link
                  href="/payables"
                  className="text-xs  text-ink/40 hover:text-ink/60 transition-vintage"
                >
                  Ver todos
                </Link>
              </div>
            </VintageCard>

            <VintageCard className="!bg-paper">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-serif text-coffee">Lembretes da casa</h3>
                  <p className="text-sm text-ink/60 ">Notas de cuidado com aquilo que valorizamos.</p>
                </div>
                <button
                  onClick={() => setIsReminderModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-petrol text-white flex items-center justify-center hover:opacity-90 transition-vintage shrink-0"
                  aria-label="Novo lembrete"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-ink/60">Carregando...</div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-ink/60  mb-2">Sem lembretes por agora</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border border-border transition-vintage ${
                        reminder.is_done ? 'opacity-60' : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleDone(reminder.id, reminder.is_done)}
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-vintage ${
                          reminder.is_done
                            ? 'bg-olive border-olive'
                            : 'border-border hover:border-olive'
                        }`}
                        aria-label={`Marcar ${reminder.title} como ${reminder.is_done ? 'pendente' : 'feito'}`}
                      >
                        {reminder.is_done && <Check className="w-4 h-4 text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-body ${reminder.is_done ? 'line-through' : ''}`}>
                          {reminder.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {reminder.due_date && (
                            <span className={`text-xs px-2 py-0.5 rounded ${getReminderBadgeColor(reminder)}`}>
                              {formatDate(reminder.due_date, 'dd/MM')}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColors[reminder.category] || getCategoryColors['Outros']}`}>
                            {reminder.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3">
                <Link
                  href="/reminders"
                  className="text-xs  text-ink/40 hover:text-ink/60 transition-vintage"
                >
                  Ver todos
                </Link>
              </div>
            </VintageCard>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Novo lembrete"
      >
        <form onSubmit={handleCreateReminder} className="space-y-4">
          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Título <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={reminderForm.title}
              onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="Ex: Conferir conta de água"
            />
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              type="date"
              value={reminderForm.due_date}
              onChange={(event) => setReminderForm({ ...reminderForm, due_date: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
            />
          </div>

          <Select
            label="Categoria"
            value={reminderForm.category}
            onChange={(value) => setReminderForm({ ...reminderForm, category: value })}
            options={[
              { value: 'Conta', label: 'Conta' },
              { value: 'Casa', label: 'Casa' },
              { value: 'Sonhos', label: 'Sonhos' },
              { value: 'Família', label: 'Família' },
              { value: 'Outros', label: 'Outros' },
            ]}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(false)}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
