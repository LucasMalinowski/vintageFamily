'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import EmptyState from '@/components/ui/EmptyState'
import { BellRing, Check } from 'lucide-react'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'

interface Reminder {
  id: string
  title: string
  due_date: string | null
  category: string
  is_done: boolean
}

export default function RemindersPage() {
  const { familyId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    category: 'Outros',
  })

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
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true })

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
        done_at: !isDone ? new Date().toISOString() : null,
      })
      .eq('id', id)

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, is_done: !isDone } : reminder
      )
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!familyId || !formData.title.trim()) return

    await supabase.from('reminders').insert({
      family_id: familyId,
      title: formData.title.trim(),
      due_date: formData.due_date || null,
      category: formData.category || 'Outros',
      recurrence: 'none',
      is_done: false,
      note: null,
      due_time: null,
    })

    setFormData({ title: '', due_date: '', category: 'Outros' })
    setIsModalOpen(false)
    loadReminders()
  }

  const getReminderBadgeColor = (reminder: Reminder) => {
    if (reminder.is_done) return 'bg-olive/20 text-olive'
    if (isDueDateOverdue(reminder.due_date, reminder.is_done)) return 'bg-terracotta/20 text-terracotta'
    if (isDueDateToday(reminder.due_date)) return 'bg-olive/20 text-olive'
    return 'bg-ink/10 text-ink'
  }

  const getCategoryColors: Record<string, string> = {
    Conta: 'bg-terracotta text-white',
    Casa: 'bg-olive text-white',
    Sonhos: 'bg-petrol text-white',
    Família: 'bg-coffee text-white',
    Outros: 'bg-ink/70 text-white',
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title="Lembretes"
          subtitle="Pequenas lembranças para um mês mais leve."
          variant="textured"
          actions={
            <button
              onClick={() => setIsModalOpen(true)}
              className="min-w-[160px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
            >
              + Novo lembrete
            </button>
          }
        />

        <div className="flex-1 px-6 pb-4">
          {loading ? (
            <div className="py-12 text-center text-ink/60">Carregando...</div>
          ) : reminders.length === 0 ? (
            <div className="rounded-[12px] border border-border bg-offWhite px-6 py-10 shadow-soft">
              <EmptyState
                icon={<BellRing className="w-16 h-16" />}
                message="Sem lembretes por agora."
                submessage="Que o mês siga tranquilo."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`rounded-[12px] border border-border bg-offWhite p-5 shadow-soft transition-vintage ${
                    reminder.is_done ? 'opacity-65' : 'hover:shadow-vintage'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleDone(reminder.id, reminder.is_done)}
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border transition-vintage ${
                        reminder.is_done
                          ? 'border-olive bg-olive'
                          : 'border-border bg-paper hover:border-olive'
                      }`}
                      aria-label={`Marcar ${reminder.title} como ${reminder.is_done ? 'pendente' : 'feito'}`}
                    >
                      {reminder.is_done ? <Check className="h-4 w-4 text-white" /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className={`font-body text-base text-sidebar ${reminder.is_done ? 'line-through' : ''}`}>
                            {reminder.title}
                          </p>
                          <p className="mt-1 text-sm text-ink/45">
                            {reminder.is_done
                              ? 'Concluído.'
                              : reminder.due_date
                                ? `Vence em ${formatDate(reminder.due_date)}.`
                                : 'Sem data definida.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {reminder.due_date ? (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getReminderBadgeColor(reminder)}`}>
                              {formatDate(reminder.due_date, 'dd/MM')}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              getCategoryColors[reminder.category] || getCategoryColors['Outros']
                            }`}
                          >
                            {reminder.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="mt-auto w-full">
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              Lembrar com calma tambem e uma forma de cuidar da casa.
            </p>
          </div>
        </footer>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo lembrete"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Título <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conferir conta de água"
            />
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>

          <Select
            label="Categoria"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
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
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-sidebar text-paper rounded-lg hover:bg-olive/90 transition-vintage"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
