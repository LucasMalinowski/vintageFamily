'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import EmptyState from '@/components/ui/EmptyState'
import { BellRing, Check } from 'lucide-react'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'

function ReminderRow({
  reminder,
  onToggle,
  getCategoryColors,
}: {
  reminder: { id: string; title: string; due_date: string | null; category: string; is_done: boolean }
  onToggle: (id: string, isDone: boolean) => void
  getCategoryColors: Record<string, string>
}) {
  const isOverdue = !reminder.is_done && isDueDateOverdue(reminder.due_date, reminder.is_done)
  const isToday = !reminder.is_done && isDueDateToday(reminder.due_date)

  const dateBadgeClass = reminder.is_done
    ? 'bg-olive/20 text-olive'
    : isOverdue
      ? 'bg-terracotta/15 text-terracotta'
      : isToday
        ? 'bg-olive/20 text-olive'
        : 'bg-gold/20 text-gold'

  return (
    <div
      className={`flex items-start gap-3 px-[14px] py-3 rounded-[10px] border border-border transition-vintage ${
        reminder.is_done ? 'opacity-55' : 'hover:shadow-soft'
      }`}
    >
      <button
        onClick={() => onToggle(reminder.id, reminder.is_done)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage ${
          reminder.is_done ? 'border-olive bg-olive' : 'border-border bg-transparent hover:border-olive'
        }`}
        aria-label={`Marcar ${reminder.title} como ${reminder.is_done ? 'pendente' : 'feito'}`}
      >
        {reminder.is_done ? <Check className="h-3 w-3 text-white" /> : null}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm text-ink font-body ${reminder.is_done ? 'line-through' : ''}`}>
          {reminder.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {reminder.due_date && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${dateBadgeClass}`}>
              {formatDate(reminder.due_date, 'dd/MM')}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              getCategoryColors[reminder.category] || getCategoryColors['Outros']
            }`}
          >
            {reminder.category}
          </span>
        </div>
      </div>
    </div>
  )
}

interface Reminder {
  id: string
  title: string
  due_date: string | null
  category: string
  is_done: boolean
  hidden_on_dashboard: boolean
}

type ReminderFilter = 'pending' | 'done' | null

export default function Reminders() {
  const { familyId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ReminderFilter>(null)
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

  const pendingReminders = reminders.filter((reminder) => !reminder.is_done)
  const completedReminders = reminders.filter((reminder) => reminder.is_done)
  const filteredReminders =
    statusFilter === 'pending'
      ? pendingReminders
      : statusFilter === 'done'
        ? completedReminders
        : reminders

  async function loadReminders() {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('family_id', familyId!)
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true })
      .limit(500)

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
        hidden_on_dashboard: false,
        done_at: !isDone ? new Date().toISOString() : null,
      })
      .eq('id', id)

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, is_done: !isDone } : reminder
      )
    )
  }

  const handleStatusFilterChange = (nextFilter: Exclude<ReminderFilter, null>) => {
    setStatusFilter((current) => (current === nextFilter ? null : nextFilter))
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
      hidden_on_dashboard: false,
      note: null,
      due_time: null,
    })

    setFormData({ title: '', due_date: '', category: 'Outros' })
    setIsModalOpen(false)
    loadReminders()
  }

  const getCategoryColors: Record<string, string> = {
    Conta: 'bg-terracotta text-white',
    Casa: 'bg-olive text-white',
    Sonhos: 'bg-petrol text-white',
    Família: 'bg-coffee text-white',
    Outros: 'bg-ink/70 text-white',
  }

  return (
    <>
      <div className="flex flex-col h-full md:min-h-screen">
        <Topbar
          title="Lembretes"
          subtitle="Pequenas notas de cuidado para a casa."
          variant="textured"
          showBackButton
          actions={
            <div className="hidden md:flex">
              <button
                onClick={() => setIsModalOpen(true)}
                className="min-w-[160px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
              >
                + Novo lembrete
              </button>
            </div>
          }
        />

        {/* Scrollable cards area — mobile only internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible px-[18px] pt-3 pb-4 md:px-6 md:pt-0">
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
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('pending')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-vintage ${
                    statusFilter === 'pending'
                      ? 'bg-sidebar text-paper'
                      : 'border border-border bg-offWhite text-ink hover:bg-paper'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusFilterChange('done')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-vintage ${
                    statusFilter === 'done'
                      ? 'bg-sidebar text-paper'
                      : 'border border-border bg-offWhite text-ink hover:bg-paper'
                  }`}
                >
                  Concluídos
                </button>
              </div>

              {filteredReminders.length === 0 ? (
                <div className="rounded-[12px] border border-border bg-offWhite px-6 py-10 shadow-soft text-center">
                  <p className="text-petrol mb-2">
                    {statusFilter === 'pending'
                      ? 'Sem lembretes pendentes.'
                      : statusFilter === 'done'
                        ? 'Sem lembretes concluídos.'
                        : 'Sem lembretes para mostrar.'}
                  </p>
                  <p className="text-sm text-ink/50">
                    Clique no filtro ativo novamente para limpar a seleção.
                  </p>
                </div>
              ) : statusFilter === null ? (
                <div className="space-y-6">
                  {pendingReminders.length > 0 && (
                    <div>
                      <p className="font-serif text-xl text-coffee mb-3">Pendentes</p>
                      <div className="space-y-2">
                        {pendingReminders.map((reminder) => (
                          <ReminderRow
                            key={reminder.id}
                            reminder={reminder}
                            onToggle={toggleDone}
                            getCategoryColors={getCategoryColors}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedReminders.length > 0 && (
                    <div>
                      <p className="font-serif text-xl text-coffee mb-3 mt-3">Concluídos</p>
                      <div className="space-y-2">
                        {completedReminders.map((reminder) => (
                          <ReminderRow
                            key={reminder.id}
                            reminder={reminder}
                            onToggle={toggleDone}
                            getCategoryColors={getCategoryColors}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReminders.map((reminder) => (
                    <ReminderRow
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={toggleDone}
                      getCategoryColors={getCategoryColors}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile footer — sticky outside scroll */}
        <div className="md:hidden shrink-0 px-[18px] pt-2 pb-2 border-t border-border bg-offWhite">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-coffee text-paper rounded-[12px] py-[13px] text-sm font-semibold transition-vintage hover:bg-coffee/90"
          >
            + Novo lembrete
          </button>
          <div className="h-[40px] flex items-center justify-center">
            <p className="text-center text-[13px] text-gold italic">
              Lembrar com calma também é uma forma de cuidar da casa.
            </p>
          </div>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              Lembrar com calma também é uma forma de cuidar da casa.
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
    </>
  )
}
