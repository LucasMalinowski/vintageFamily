'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Check, Plus } from 'lucide-react'
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
      <Topbar
        title="Lembretes"
        subtitle="Pequenas lembranças para um mês mais leve."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-fabGreen text-white rounded-lg hover:bg-fabGreen/90 transition-vintage text-sm"
          >
            + Novo lembrete
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <VintageCard>
          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-ink/60 italic mb-2">Sem lembretes por agora.</p>
              <p className="text-ink/40 text-sm">Que o mês siga tranquilo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border border-border transition-vintage ${
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
        </VintageCard>
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
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="Ex: Conferir conta de água"
            />
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(event) => setFormData({ ...formData, due_date: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
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
              className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
