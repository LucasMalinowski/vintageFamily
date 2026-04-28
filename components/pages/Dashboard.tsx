'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../AuthProvider'
import Topbar from '../layout/Topbar'
import VintageCard from '../ui/VintageCard'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { formatDate, isDueDateToday, isDueDateOverdue } from '@/lib/dates'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'

const PHRASES = [
  'Organizar o dinheiro é cuidar do tempo que ainda vamos viver.',
  'O amor também mora nos detalhes do orçamento.',
  'Cuidar do dinheiro da casa é cuidar do tempo juntos.',
  'Cada real guardado é um passo mais leve amanhã.',
  'A paz começa quando os números fazem sentido.',
  'Planejar juntos é a linguagem do cuidado.',
  'Dinheiro bem cuidado, família bem vivida.',
  'O futuro agradece o planejamento de hoje.',
  'Juntos, cada conta paga é uma vitória da família.',
  'Gastar com consciência é um ato de amor.',
  'Pequenos controles, grandes tranquilidades.',
  'Quando o dinheiro está em ordem, a mente respira.',
  'A família que planeja junta, conquista junta.',
  'Economizar hoje é presentear o amanhã.',
  'Cada escolha financeira é um voto de confiança no futuro.',
  'O orçamento é o mapa do lar.',
  'Simplicidade financeira, riqueza de momentos.',
  'Finanças em dia, vida mais leve.',
  'Quem cuida do centavo, cuida do sonho.',
  'Lembrar com calma também é uma forma de cuidar da casa.',
]

function pickNext(current: string): string {
  const pool = PHRASES.filter((p) => p !== current)
  return pool[Math.floor(Math.random() * pool.length)]
}

function useTypewriter() {
  const [displayed, setDisplayed] = useState('')
  const [cursor, setCursor] = useState(true)
  const phraseRef = useRef(PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const indexRef = useRef(0)
  const directionRef = useRef<'typing' | 'deleting'>('typing')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const blinkInterval = setInterval(() => setCursor((c) => !c), 530)

    function tick() {
      const phrase = phraseRef.current

      if (directionRef.current === 'typing') {
        if (indexRef.current < phrase.length) {
          indexRef.current += 1
          setDisplayed(phrase.slice(0, indexRef.current))
          timerRef.current = setTimeout(tick, 60 + Math.random() * 40)
        } else {
          timerRef.current = setTimeout(() => {
            directionRef.current = 'deleting'
            tick()
          }, 2600)
        }
      } else {
        if (indexRef.current > 0) {
          indexRef.current -= 1
          setDisplayed(phrase.slice(0, indexRef.current))
          timerRef.current = setTimeout(tick, 35 + Math.random() * 20)
        } else {
          phraseRef.current = pickNext(phraseRef.current)
          directionRef.current = 'typing'
          setDisplayed('')
          timerRef.current = setTimeout(tick, 400)
        }
      }
    }

    timerRef.current = setTimeout(tick, 700)

    return () => {
      clearInterval(blinkInterval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { displayed, cursor }
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

interface Payable {
  id: string
  description: string
  date: string
  category_name: string
}

export default function Dashboard() {
  const { displayed, cursor } = useTypewriter()
  const { familyId, user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [pendingPayables, setPendingPayables] = useState<Payable[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPayables, setLoadingPayables] = useState(true)
  const [familyName, setFamilyName] = useState('')
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>(null)
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

  const pendingReminders = reminders.filter((reminder) => !reminder.is_done)
  const completedReminders = reminders.filter((reminder) => reminder.is_done)
  const visibleReminders =
    reminderFilter === 'pending'
      ? pendingReminders
      : reminderFilter === 'done'
        ? completedReminders
        : reminders

  async function loadReminders() {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('family_id', familyId!)
      .order('is_done', { ascending: true })
      .order('due_date', { ascending: true })
      .limit(5)

    if (data) {
      setReminders(data.filter((reminder) => !reminder.hidden_on_dashboard))
    }
    setLoading(false)
  }

  async function loadPendingPayables() {
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

  async function loadFamilyName() {
    const cachedFamilyName = window.localStorage.getItem(LOCAL_STORAGE_KEYS.familyName)
    if (cachedFamilyName) {
      setFamilyName(cachedFamilyName)
      return
    }

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
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
      return
    }

    const { data: familyRow } = await supabase
      .from('families')
      .select('name')
      .eq('id', effectiveFamilyId)
      .maybeSingle()

    if (familyRow?.name) {
      setFamilyName(familyRow.name)
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, familyRow.name)
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
    const resolvedFamilyName = payload?.familyName || ''
    setFamilyName(resolvedFamilyName)
    if (resolvedFamilyName) {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.familyName, resolvedFamilyName)
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.familyName)
    }
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    await supabase
      .from('reminders')
      .update({ 
        is_done: !isDone,
        hidden_on_dashboard: false,
        done_at: !isDone ? new Date().toISOString() : null
      })
      .eq('id', id)

    setReminders((prev) =>
      prev.map((reminder) =>
        reminder.id === id ? { ...reminder, is_done: !isDone } : reminder
      )
    )
  }

  const handleReminderFilterChange = (nextFilter: Exclude<ReminderFilter, null>) => {
    setReminderFilter((current) => (current === nextFilter ? null : nextFilter))
  }

  const clearCompleted = async () => {
    const completedIds = reminders.filter((reminder) => reminder.is_done).map((reminder) => reminder.id)
    if (completedIds.length === 0) return

    await supabase
      .from('reminders')
      .update({ hidden_on_dashboard: true })
      .eq('family_id', familyId!)
      .eq('is_done', true)
      .eq('hidden_on_dashboard', false)

    setReminders((prev) => prev.filter((reminder) => !reminder.is_done))
    setReminderFilter(null)
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
      hidden_on_dashboard: false,
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
        subtitle="Espaço financeiro familiar"
        variant="textured"
      />
      <div className="bg-paper">
        {/* Mobile hero — full-width, no rounded corners */}
        <div className="md:hidden bg-[url('/texture-green.png')] bg-cover bg-center py-8 text-center text-paper">
          <p className="text-[10px] tracking-[0.22em] uppercase text-paper/60 mb-3 font-medium">
            Família {familyName || '—'}
          </p>
          <h1 className="text-3xl font-serif font-thin text-paper leading-snug px-6">
            Livro de Finanças<br/>da Família {familyName || '—'}
          </h1>
          <div className="w-10 h-px bg-gold/60 mx-auto mt-5" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-8">
          {/* Desktop hero — inside container with rounded corners */}
          <div className="hidden md:block rounded-[20px] overflow-hidden mb-8 bg-[url('/texture-green.png')] bg-cover bg-center py-8 text-center text-paper">
            <h1 className="text-4xl font-serif font-thin text-paper leading-snug px-6">
              Livro de Finanças<br/>da Família {familyName || '—'}
            </h1>
            <div className="w-10 h-px bg-gold/60 mx-auto mt-5" />
          </div>

          <div className="flex justify-center">
            <p className="max-w-xl text-center text-ink/60 font-ptSerif italic text-base md:text-lg leading-relaxed min-h-[2.5em]">
              {displayed}
              <span
                className={`inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-gold transition-opacity duration-100 ${
                  cursor ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VintageCard className="!bg-paper flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-body font-thin text-sidebar">Contas pendentes</h3>
                  <p className="text-sm text-ink/40 ">Que a casa siga leve.</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col">
                {loadingPayables ? (
                  <div className="flex-1 text-center py-8 text-ink/60">Carregando...</div>
                ) : pendingPayables.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-8">
                    <p className="text-petrol mb-2">Sem contas pendentes</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {pendingPayables.map((payable) => (
                      <Link
                        key={payable.id}
                        href={`/expenses#expense-${payable.id}`}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-paper transition-vintage"
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
              </div>
              <div className="mt-auto pt-3">
                <Link
                  href="/expenses"
                  className="text-xs text-ink/40 hover:text-ink/60 transition-vintage"
                >
                  Ver todos →
                </Link>
              </div>
            </VintageCard>

            <VintageCard className="!bg-paper flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-body font-thin text-sidebar">Lembretes da casa</h3>
                  <p className="text-sm text-ink/40">Notas de cuidado.</p>
                </div>
                <button
                  onClick={() => setIsReminderModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-petrol text-white flex items-center justify-center hover:opacity-90 transition-vintage shrink-0"
                  aria-label="Novo lembrete"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReminderFilterChange('pending')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-vintage ${
                    reminderFilter === 'pending'
                      ? 'bg-sidebar text-paper'
                      : 'border border-border bg-offWhite text-ink hover:bg-paper'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  type="button"
                  onClick={() => handleReminderFilterChange('done')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-vintage ${
                    reminderFilter === 'done'
                      ? 'bg-sidebar text-paper'
                      : 'border border-border bg-offWhite text-ink hover:bg-paper'
                  }`}
                >
                  Concluídos
                </button>
                <button
                  type="button"
                  onClick={clearCompleted}
                  disabled={completedReminders.length === 0}
                  className="rounded-full border border-border bg-offWhite px-3 py-1.5 text-xs font-semibold text-ink transition-vintage hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpar concluídos
                </button>
              </div>

              <div className="flex flex-1 flex-col">
                {loading ? (
                  <div className="flex-1 text-center py-8 text-ink/60">Carregando...</div>
                ) : reminders.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-8">
                    <p className="text-petrol mb-2">Sem lembretes por agora</p>
                  </div>
                ) : visibleReminders.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-8">
                    <p className="text-petrol">Sem lembretes para mostrar.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {visibleReminders.map((reminder) => (
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
              </div>
              <div className="mt-auto pt-3">
                <Link
                  href="/reminders"
                  className="text-xs text-ink/40 hover:text-ink/60 transition-vintage"
                >
                  Ver todos →
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
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conferir conta de água"
            />
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              type="date"
              value={reminderForm.due_date}
              onChange={(event) => setReminderForm({ ...reminderForm, due_date: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
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
