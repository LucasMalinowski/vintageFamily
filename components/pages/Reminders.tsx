'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import Modal from '@/components/ui/Modal'
import RightDrawer from '@/components/ui/RightDrawer'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { triggerWidgetSync } from '@/lib/notifications/triggerWidgetSync'
import { useAuth } from '@/components/AuthProvider'
import EmptyState from '@/components/ui/EmptyState'
import { BellRing, Check, Pencil, Trash2 } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'

interface Reminder {
  id: string
  title: string
  due_date: string | null
  category: string
  is_done: boolean
  hidden_on_dashboard: boolean
}

const REMINDER_CAT_COLORS: Record<string, string> = {
  Conta: '#C06060', Casa: '#6FBF8A', Sonhos: '#3F6E7A', Família: '#3E5F4B', Outros: '#2F3B33',
}

function ReminderRow({
  reminder,
  onToggle,
  onDelete,
  onEdit,
  getCategoryColors,
}: {
  reminder: Reminder
  onToggle: (id: string, isDone: boolean) => void
  onDelete?: (id: string) => void
  onEdit?: (reminder: Reminder) => void
  getCategoryColors: Record<string, string>
}) {
  const isOverdue = !reminder.is_done && isDueDateOverdue(reminder.due_date, reminder.is_done)
  const isToday = !reminder.is_done && isDueDateToday(reminder.due_date)
  const catColor = REMINDER_CAT_COLORS[reminder.category] ?? '#2F3B33'

  const dateBg = reminder.is_done
    ? 'rgba(111,191,138,0.18)' : isOverdue
    ? 'rgba(192,96,96,0.18)' : isToday
    ? 'rgba(111,191,138,0.18)'
    : 'rgba(194,164,93,0.22)'
  const dateFg = reminder.is_done ? '#3E8E5C' : isOverdue ? '#C06060' : isToday ? '#3E8E5C' : '#A58E5F'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border border-border bg-white transition-vintage ${
        reminder.is_done ? 'opacity-60' : 'hover:shadow-soft'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(reminder.id, reminder.is_done)}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-vintage ${
          reminder.is_done ? 'border-olive bg-olive' : 'border-border bg-transparent hover:border-olive'
        }`}
        aria-label={`Marcar ${reminder.title} como ${reminder.is_done ? 'pendente' : 'feito'}`}
      >
        {reminder.is_done ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
      </button>

      <p className={`flex-1 text-[14px] text-ink ${reminder.is_done ? 'line-through' : ''}`}>
        {reminder.title}
      </p>

      {reminder.due_date && (
        <span className="rounded-xl px-2.5 py-1 text-[11.5px] font-semibold shrink-0" style={{ background: dateBg, color: dateFg }}>
          {formatDate(reminder.due_date, 'dd/MM')}
        </span>
      )}

      <span
        className="rounded-xl px-2.5 py-1 text-[11.5px] font-semibold text-white shrink-0"
        style={{ background: catColor }}
      >
        {reminder.category}
      </span>

      <button
        type="button"
        onClick={() => onEdit?.(reminder)}
        className="p-1 rounded text-ink/35 hover:text-petrol transition-vintage shrink-0"
        aria-label="Editar"
      >
        <Pencil className="w-[14px] h-[14px]" />
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(reminder.id)}
          className="p-1 rounded text-ink/35 hover:text-terracotta transition-vintage shrink-0"
          aria-label="Excluir"
        >
          <Trash2 className="w-[14px] h-[14px]" />
        </button>
      )}
    </div>
  )
}

type ReminderFilter = 'pending' | 'done' | 'overdue' | null

export default function Reminders() {
  const { familyId } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ReminderFilter>(null)
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    category: 'Outros',
  })

  const pendingReminders = reminders.filter((reminder) => !reminder.is_done)
  const completedReminders = reminders.filter((reminder) => reminder.is_done)
  const overdueReminders = reminders.filter(
    (reminder) => !reminder.is_done && isDueDateOverdue(reminder.due_date, reminder.is_done)
  )
  const filteredReminders =
    statusFilter === 'pending'
      ? pendingReminders
      : statusFilter === 'done'
        ? completedReminders
        : statusFilter === 'overdue'
          ? overdueReminders
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

  useEffect(() => {
    if (familyId) {
      loadReminders()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])

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
    triggerWidgetSync()
  }

  const handleStatusFilterChange = (nextFilter: NonNullable<ReminderFilter>) => {
    setStatusFilter((current) => (current === nextFilter ? null : nextFilter))
  }

  const deleteReminder = (id: string) => { setDeleteConfirmId(id) }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    await supabase.from('reminders').delete().eq('id', deleteConfirmId)
    setReminders(prev => prev.filter(r => r.id !== deleteConfirmId))
    setDeleting(false)
    setDeleteConfirmId(null)
    triggerWidgetSync()
  }

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setFormData({
      title: reminder.title,
      due_date: reminder.due_date ?? '',
      category: reminder.category,
    })
    setIsModalOpen(true)
  }

  const closeReminderModal = () => {
    setIsModalOpen(false)
    setEditingReminder(null)
    setFormData({ title: '', due_date: '', category: 'Outros' })
  }

  const clearCompleted = async () => {
    const completedIds = completedReminders.map((r) => r.id)
    if (completedIds.length === 0) return
    await supabase
      .from('reminders')
      .update({ hidden_on_dashboard: true })
      .in('id', completedIds)
    setReminders((prev) => prev.filter((r) => !r.is_done))
    setStatusFilter(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!familyId || !formData.title.trim()) return

    if (editingReminder) {
      // Edit mode
      const updated = {
        title: formData.title.trim(),
        due_date: formData.due_date || null,
        category: formData.category || 'Outros',
      }
      await supabase.from('reminders').update(updated).eq('id', editingReminder.id)
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? { ...r, ...updated } : r))
    } else {
      // Create mode
      const { data } = await supabase.from('reminders').insert({
        family_id: familyId,
        title: formData.title.trim(),
        due_date: formData.due_date || null,
        category: formData.category || 'Outros',
        recurrence: 'none',
        is_done: false,
        hidden_on_dashboard: false,
        note: null,
        due_time: null,
      }).select().maybeSingle()
      if (data) setReminders(prev => [data as Reminder, ...prev])
    }

    closeReminderModal()
    triggerWidgetSync()
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
          subtitle="Pequenas notas para a casa fluir."
          accent="#3E5F4B"
          variant="textured"
          showBackButton
          actions={
            <div className="hidden md:flex">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="min-w-[160px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
              >
                + Novo lembrete
              </button>
            </div>
          }
        />

        {/* Scrollable cards area - mobile only internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible px-[18px] pt-3 pb-4 md:px-6 md:pt-0">
          {loading ? (
            <div className="py-12 text-center text-ink/60">Carregando…</div>
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
                {(
                  [
                    { key: null,       label: 'Todos',      count: reminders.length },
                    { key: 'pending',  label: 'Pendentes',  count: pendingReminders.length },
                    { key: 'done',     label: 'Concluídos', count: completedReminders.length },
                    { key: 'overdue',  label: 'Atrasados',  count: overdueReminders.length },
                  ] as { key: ReminderFilter; label: string; count: number }[]
                ).map((pill) => {
                  const isActive = statusFilter === pill.key
                  return (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => pill.key ? handleStatusFilterChange(pill.key) : setStatusFilter(null)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-vintage flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-coffee text-paper'
                          : 'border border-border bg-offWhite text-ink hover:bg-paper'
                      }`}
                    >
                      {pill.label}
                      <span
                        className={`rounded-full text-[11px] px-1.5 min-w-[18px] text-center ${
                          isActive ? 'bg-white/20 text-paper' : 'bg-ink/[0.07] text-ink/55'
                        }`}
                      >
                        {pill.count}
                      </span>
                    </button>
                  )
                })}
                <div className="hidden md:flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={clearCompleted}
                    disabled={completedReminders.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg text-ink/60 text-[12.5px] font-medium hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-vintage"
                  >
                    Limpar concluídos
                  </button>
                </div>
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
                <div className="space-y-5">
                  {pendingReminders.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-px bg-[#B05C3A]/40" />
                        <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-[#B05C3A]/70">Pendentes · {pendingReminders.length}</span>
                      </div>
                      <div className="space-y-2">
                        {pendingReminders.map((reminder) => (
                          <ReminderRow key={reminder.id} reminder={reminder} onToggle={toggleDone} onDelete={deleteReminder} onEdit={openEdit} getCategoryColors={getCategoryColors} />
                        ))}
                      </div>
                    </div>
                  )}
                  {completedReminders.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-px bg-olive/40" />
                        <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-olive/70">Concluídos · {completedReminders.length}</span>
                      </div>
                      <div className="space-y-2">
                        {completedReminders.map((reminder) => (
                          <ReminderRow key={reminder.id} reminder={reminder} onToggle={toggleDone} onDelete={deleteReminder} onEdit={openEdit} getCategoryColors={getCategoryColors} />
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
                      onDelete={deleteReminder}
                      onEdit={openEdit}
                      getCategoryColors={getCategoryColors}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile footer - sticky outside scroll */}
        <div className="md:hidden shrink-0 px-[18px] pt-2 pb-2 border-t border-border bg-offWhite">
          <button
            type="button"
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

      <RightDrawer
        isOpen={isModalOpen}
        onClose={closeReminderModal}
        subtitle="Pequenas notas para a casa fluir."
        accent="#3E5F4B"
        title={editingReminder ? 'Editar lembrete' : 'Novo lembrete'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reminder-title" className="block text-sm font-body text-ink mb-2">
              Título <span className="text-terracotta">*</span>
            </label>
            <input
              id="reminder-title"
              type="text"
              required
              value={formData.title}
              aria-label="Título do lembrete"
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conferir conta de água"
            />
          </div>

          <div>
            <label htmlFor="reminder-date" className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              id="reminder-date"
              type="date"
              value={formData.due_date}
              onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
              aria-label="Data de vencimento"
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
      </RightDrawer>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Excluir lembrete"
        message="Este lembrete será removido permanentemente."
        confirmLabel="Excluir"
        loading={deleting}
      />
    </>
  )
}
