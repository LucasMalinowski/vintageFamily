'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Calendar, Check, Plus, PiggyBank, Receipt, Trash2, TrendingUp, Lightbulb } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../AuthProvider'
import Topbar from '../layout/Topbar'
import VintageCard from '../ui/VintageCard'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { formatDate, isDueDateToday, isDueDateOverdue, getCurrentMonth, getCurrentYear } from '@/lib/dates'
import { LOCAL_STORAGE_KEYS } from '@/lib/storage'
import { loadCategoryLimitsForMonth, type CategoryLimitRow, limitBarColor, formatLimitBadge } from '@/lib/categoryLimits'
import { formatBRL } from '@/lib/money'

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
  const [initialPhrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)])
  const phraseRef = useRef(initialPhrase)
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

function DesktopHeroCard({
  familyName,
  expensePaid,
  expenseOpen,
  expenseOverdue,
  incomeTotal,
}: {
  familyName: string
  expensePaid: number
  expenseOpen: number
  expenseOverdue: number
  incomeTotal: number
}) {
  const totalExpenses = expensePaid + expenseOpen + expenseOverdue
  const balance = incomeTotal - totalExpenses
  const paidPct = totalExpenses > 0 ? Math.round((expensePaid / totalExpenses) * 100) : 0
  const openPct = totalExpenses > 0 ? Math.round((expenseOpen / totalExpenses) * 100) : 0
  const overduePct = totalExpenses > 0 ? Math.round((expenseOverdue / totalExpenses) * 100) : 0
  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long' })
  const yearLabel = now.getFullYear()

  return (
    <div
      className="rounded-[18px] overflow-hidden px-7 py-7 relative"
      style={{
        background: 'linear-gradient(135deg, #3E5F4B 0%, #344e3f 55%, #2a4034 100%)',
        boxShadow: '0 14px 28px rgba(62,95,75,0.18)',
      }}
    >
      {/* Diagonal stripes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(194,164,93,0.04) 0 1px, transparent 1px 22px)' }}
      />
      {/* Gold thread */}
      <span className="absolute left-[15%] right-[15%] bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(194,164,93,0.55), transparent)' }} />

      <div className="relative flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/55 mb-1">
            Família {familyName || '-'} · {monthLabel} {yearLabel}
          </p>
          <p className="font-serif font-light text-[28px] text-white/90 leading-tight mb-4">
            Livro de Finanças da Família
          </p>
          <p className="font-numbers font-bold text-[42px] text-white leading-none tracking-[-1px] tabular-nums">
            {formatBRL(Math.max(balance, 0))}
          </p>
          <p className="text-[12.5px] text-white/60 mt-1">Saldo estimado do mês</p>
        </div>
        <p className="font-serif italic text-[13px] text-white/65 max-w-[220px] text-right leading-relaxed hidden lg:block">
          &ldquo;Organizar o dinheiro é cuidar do tempo que ainda vamos viver.&rdquo;
        </p>
      </div>

      {/* 3-segment bar */}
      {totalExpenses > 0 && (
        <div className="relative mt-6">
          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div style={{ width: `${paidPct}%`, background: '#6FBF8A' }} />
            <div style={{ width: `${openPct}%`, background: '#C2A45D' }} />
            <div style={{ width: `${overduePct}%`, background: '#B05C3A' }} />
          </div>
          <div className="flex gap-5 mt-2.5">
            {[
              { label: 'Pago',      color: '#6FBF8A', pct: paidPct,    val: expensePaid },
              { label: 'Em aberto', color: '#C2A45D', pct: openPct,    val: expenseOpen },
              { label: 'Atrasado',  color: '#B05C3A', pct: overduePct, val: expenseOverdue },
            ].map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="text-[12px] text-white/70 font-medium">
                  {seg.label} ·{' '}
                  <b className="text-white font-numbers tabular-nums">{formatBRL(seg.val)}</b>
                  <span className="ml-1 text-white/40">{seg.pct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
  const [limitRows, setLimitRows] = useState<CategoryLimitRow[]>([])
  const [loadingLimits, setLoadingLimits] = useState(true)
  const [monthStats, setMonthStats] = useState<{
    incomeTotal: number
    expensePaid: number
    expenseOpen: number
    expenseOverdue: number
  } | null>(null)
  const [topSavings, setTopSavings] = useState<Array<{ id: string; name: string; balance: number; target: number | null; delta: number }>>([])
  const [reminderForm, setReminderForm] = useState({
    title: '',
    due_date: '',
    category: 'Outros',
  })

  useEffect(() => {
    if (familyId) {
      loadReminders()
      loadPendingPayables()
      const now = new Date()
      loadCategoryLimitsForMonth(familyId, now.getFullYear(), now.getMonth() + 1)
        .then(setLimitRows)
        .finally(() => setLoadingLimits(false))
      loadMonthStats(familyId)
      loadTopSavings(familyId)
    } else {
      setLoading(false)
      setLoadingPayables(false)
      setLoadingLimits(false)
    }
    loadFamilyName()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, user?.id])

  async function loadMonthStats(fid: string) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10)
    const today = now.toISOString().slice(0, 10)
    const [expRes, incRes] = await Promise.all([
      supabase.from('expenses').select('amount_cents,status,date').eq('family_id', fid).gte('date', firstDay).lte('date', lastDay),
      supabase.from('incomes').select('amount_cents').eq('family_id', fid).gte('date', firstDay).lte('date', lastDay),
    ])
    const exps = expRes.data ?? []
    const expensePaid = exps.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount_cents, 0)
    const expenseOpen = exps.filter(e => e.status !== 'paid' && e.date >= today).reduce((s, e) => s + e.amount_cents, 0)
    const expenseOverdue = exps.filter(e => e.status !== 'paid' && e.date < today).reduce((s, e) => s + e.amount_cents, 0)
    const incomeTotal = (incRes.data ?? []).reduce((s, e) => s + e.amount_cents, 0)
    setMonthStats({ incomeTotal, expensePaid, expenseOpen, expenseOverdue })
  }

  async function loadTopSavings(fid: string) {
    const { data: savingsData } = await supabase.from('savings').select('id,name,target_cents,parent_id').eq('family_id', fid).is('parent_id', null).order('name').limit(4)
    if (!savingsData?.length) return
    const ids = savingsData.map(s => s.id)
    const { data: contribs } = await supabase.from('savings_contributions').select('saving_id,amount_cents,type').eq('family_id', fid).in('saving_id', ids)
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const { data: monthContribs } = await supabase.from('savings_contributions').select('saving_id,amount_cents,type').eq('family_id', fid).in('saving_id', ids).gte('date', monthStart)
    setTopSavings(savingsData.map(s => {
      const allDep = (contribs ?? []).filter(c => c.saving_id === s.id && c.type !== 'withdrawal').reduce((acc, c) => acc + c.amount_cents, 0)
      const allWit = (contribs ?? []).filter(c => c.saving_id === s.id && c.type === 'withdrawal').reduce((acc, c) => acc + c.amount_cents, 0)
      const delta = (monthContribs ?? []).filter(c => c.saving_id === s.id && c.type !== 'withdrawal').reduce((acc, c) => acc + c.amount_cents, 0)
      return { id: s.id, name: s.name, balance: allDep - allWit, target: s.target_cents, delta }
    }))
  }

  const pendingReminders = reminders.filter((reminder) => !reminder.is_done)
  const completedReminders = reminders.filter((reminder) => reminder.is_done)
  const visibleReminders =
    reminderFilter === 'pending'
      ? pendingReminders
      : reminderFilter === 'done'
        ? completedReminders
        : reminders

  async function loadReminders() {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('family_id', familyId!)
        .eq('hidden_on_dashboard', false)
        .order('is_done', { ascending: true })
        .order('due_date', { ascending: true })
        .limit(5)

      if (process.env.NODE_ENV === 'development' && error) {
        console.warn('[Dashboard] loadReminders error:', error)
      }
      setReminders(data ?? [])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[Dashboard] loadReminders threw:', err)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  async function loadPendingPayables() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id,description,date,category_name')
        .eq('family_id', familyId!)
        .eq('status', 'open')
        .order('date', { ascending: true })
        .limit(5)

      if (process.env.NODE_ENV === 'development' && error) {
        console.warn('[Dashboard] loadPendingPayables error:', error)
      }
      setPendingPayables(data ?? [])
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[Dashboard] loadPendingPayables threw:', err)
      setPendingPayables([])
    } finally {
      setLoadingPayables(false)
    }
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
	    if (!reminders.some((reminder) => reminder.is_done)) return

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
        subtitle="Espaço financeiro familiar — calma e clareza."
        accent="#3E5F4B"
        variant="textured"
      />
      <div className="bg-paper">
        {/* Mobile hero - full-width, no rounded corners */}
        <div className="md:hidden bg-[url('/texture-green.png')] bg-cover bg-center py-8 text-center text-paper">
          <p className="text-[10px] tracking-[0.22em] uppercase text-paper/60 mb-3 font-medium">
            Família {familyName || '-'}
          </p>
          <h1 className="text-3xl font-serif font-thin text-paper leading-snug px-6">
            Livro de Finanças<br/>da Família {familyName || '-'}
          </h1>
          <div className="w-10 h-px bg-gold/60 mx-auto mt-5" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-8">
          {/* Desktop hero v2 — gradient card with 3-segment bar */}
          {monthStats && (
            <div className="hidden md:block mb-6 mt-4">
              <DesktopHeroCard
                familyName={familyName}
                expensePaid={monthStats.expensePaid}
                expenseOpen={monthStats.expenseOpen}
                expenseOverdue={monthStats.expenseOverdue}
                incomeTotal={monthStats.incomeTotal}
              />
            </div>
          )}

          {/* Quick actions — desktop only */}
          <div className="hidden md:grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Nova despesa', sub: 'Conta, compra, parcela', color: '#B05C3A', href: '/expenses', Icon: Receipt },
              { label: 'Nova receita', sub: 'Salário, freelance',      color: '#3E8E5C', href: '/incomes',  Icon: TrendingUp },
              { label: 'Guardar',      sub: 'Aporte num sonho',        color: '#3F6E7A', href: '/savings',  Icon: PiggyBank },
              { label: 'Lembrete',     sub: 'Algo a não esquecer',     color: '#3E5F4B', href: '/reminders',Icon: Calendar },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 bg-white border border-border rounded-[10px] px-4 py-3.5 hover:shadow-soft transition-vintage"
                style={{ borderLeft: `3px solid ${a.color}` }}
              >
                <div
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{ background: `${a.color}18`, color: a.color }}
                >
                  <a.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{a.label}</p>
                  <p className="text-[11px] text-ink/50 mt-0.5">{a.sub}</p>
                </div>
                <Plus className="w-3.5 h-3.5 text-ink/30 shrink-0" />
              </a>
            ))}
          </div>

          {/* Insights promo — desktop only */}
          <div
            className="hidden md:flex items-center gap-4 rounded-xl border p-4 mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(63,110,122,0.06) 0%, rgba(194,164,93,0.05) 100%)', borderColor: 'rgba(63,110,122,0.2)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(63,110,122,0.12)', color: '#3F6E7A' }}
            >
              <Lightbulb className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-serif text-[16px] text-coffee">Insights da família</p>
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-gold/20 text-gold">NOVO</span>
              </div>
              <p className="text-[12.5px] text-ink/60 mt-0.5">
                O Florim analisou seus últimos 90 dias e pode encontrar oportunidades de economia.
              </p>
            </div>
            <Link
              href="/insights"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-coffee text-paper text-[13px] font-semibold hover:bg-coffee/90 transition-vintage shrink-0"
            >
              Ver insights
            </Link>
          </div>

          {/* Sonhos em curso strip — desktop only */}
          {topSavings.length > 0 && (
            <div className="hidden md:block mb-4">
              <div className="flex items-baseline justify-between mb-2.5">
                <div className="flex items-baseline gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-px bg-coffee/40" />
                    <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-coffee/70">Objetivos em curso</span>
                  </div>
                  <p className="text-[12.5px] italic font-serif text-ink/50">Pequenos passos viram caminhos.</p>
                </div>
                <Link href="/savings" className="text-[12px] text-petrol font-semibold hover:underline">Ver objetivos →</Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {topSavings.map((s, i) => {
                  const pct = s.target ? Math.min(100, Math.round((s.balance / s.target) * 100)) : null
                  const colors = ['#6FBF8A', '#C2A45D', '#3F6E7A', '#B05C3A']
                  const c = colors[i % colors.length]
                  return (
                    <Link key={s.id} href="/savings" className="bg-white rounded-xl border overflow-hidden hover:shadow-soft transition-vintage block" style={{ borderColor: `${c}33` }}>
                      <div className="h-[5px]" style={{ background: c }} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-serif text-[15px] text-coffee leading-tight">{s.name}</p>
                          {pct !== null && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${c}20`, color: c }}>{pct}%</span>
                          )}
                        </div>
                        <p className="font-numbers font-bold text-[20px] text-coffee tabular-nums">{formatBRL(s.balance)}</p>
                        {s.target && <p className="text-[11px] text-ink/50 mt-0.5">de {formatBRL(s.target)}</p>}
                        {pct !== null && (
                          <div className="mt-2.5 h-[5px] rounded-full overflow-hidden" style={{ background: `${c}20` }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                          </div>
                        )}
                        {s.delta > 0 && (
                          <p className="text-[11px] font-semibold mt-2" style={{ color: c }}>+ {formatBRL(s.delta)} sem.</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Fallback: show old hero when month stats haven't loaded */}
          {!monthStats && (
            <div className="hidden md:block rounded-[20px] overflow-hidden mb-6 bg-[url('/texture-green.png')] bg-cover bg-center py-8 text-center text-paper">
              <h1 className="text-4xl font-serif font-thin text-paper leading-snug px-6">
                Livro de Finanças<br/>da Família {familyName || '-'}
              </h1>
              <div className="w-10 h-px bg-gold/60 mx-auto mt-5" />
            </div>
          )}

          <div className="flex justify-center pt-4 md:pt-0">
            <p className="max-w-xl text-center text-ink/60 font-ptSerif italic text-base md:text-lg leading-relaxed min-h-[2.5em]">
              {displayed}
              <span
                className={`inline-block w-[2px] h-[1em] ml-[2px] align-middle bg-gold transition-opacity duration-100 ${
                  cursor ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <VintageCard className="!bg-paper flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-body font-thin text-sidebar">Contas pendentes</h3>
                  <p className="text-sm text-ink/40 ">Que a casa siga leve.</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col">
                {loadingPayables ? (
                  <div className="flex-1 text-center py-8 text-ink/60">Carregando…</div>
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
              <div className="mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-body font-thin text-sidebar">Lembretes da casa</h3>
                    <p className="text-sm text-ink/40">Notas de cuidado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReminderModalOpen(true)}
                    className="w-9 h-9 rounded-full bg-petrol text-white flex items-center justify-center hover:opacity-90 transition-vintage shrink-0"
                    aria-label="Novo lembrete"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
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
                  <div className="relative group ml-auto">
                    <button
                      type="button"
                      onClick={clearCompleted}
                      disabled={completedReminders.length === 0}
                      className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-offWhite text-ink/50 hover:text-terracotta hover:border-terracotta/40 transition-vintage disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Limpar concluídos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block">
                      <span className="whitespace-nowrap rounded-md bg-ink/80 px-2 py-1 text-[11px] text-paper shadow-sm">
                        Limpar concluídos
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col">
                {loading ? (
                  <div className="flex-1 text-center py-8 text-ink/60">Carregando…</div>
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
                          type="button"
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

            {/* Limites do mês */}
            {(loadingLimits || limitRows.length > 0) && (
              <VintageCard className="!bg-paper flex flex-col lg:col-span-2">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="text-xl font-body font-thin text-sidebar">Limites do mês</h3>
                    <p className="text-sm text-ink/40">
                      {limitRows.filter((r) => r.status !== 'ok').length > 0
                        ? `${limitRows.filter((r) => r.status !== 'ok').length} ${limitRows.filter((r) => r.status !== 'ok').length === 1 ? 'categoria pede' : 'categorias pedem'} atenção.`
                        : 'Tudo dentro do planejado.'}
                    </p>
                  </div>
                  <Link href="/comparatives" className="text-xs text-ink/40 hover:text-ink/60 transition-vintage mt-1">
                    Ver todos →
                  </Link>
                </div>
                {loadingLimits ? (
                  <div className="text-sm text-ink/50 py-4">Carregando…</div>
                ) : (
                  <div className="space-y-3 mt-3">
                    {limitRows.slice(0, 3).map((row) => {
                      const barColor = limitBarColor(row.status)
                      const badge = formatLimitBadge(row)
                      return (
                        <div key={row.categoryId}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                            <span className="text-sm font-medium text-ink/85 truncate">
                              {row.categoryName}
                              {row.parentName && <span className="text-ink/40 font-normal"> · {row.parentName}</span>}
                            </span>
                            <div className="flex-1" />
                            <span className="text-xs tabular-nums text-ink/50 shrink-0">{formatBRL(row.spentCents)} de {formatBRL(row.limitCents)}</span>
                            <span className="text-xs font-semibold shrink-0 min-w-[3.5rem] text-right" style={{ color: barColor }}>
                              {badge}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-border/50 overflow-hidden mt-1.5">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </VintageCard>
            )}
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
            <label htmlFor="dash-reminder-title" className="block text-sm font-body text-ink mb-2">
              Título <span className="text-terracotta">*</span>
            </label>
            <input
              id="dash-reminder-title"
              type="text"
              required
              value={reminderForm.title}
              onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conferir conta de água"
              aria-label="Título do lembrete"
            />
          </div>

          <div>
            <label htmlFor="dash-reminder-date" className="block text-sm font-body text-ink mb-2">Data</label>
            <input
              id="dash-reminder-date"
              type="date"
              value={reminderForm.due_date}
              onChange={(event) => setReminderForm({ ...reminderForm, due_date: event.target.value })}
              aria-label="Data de vencimento do lembrete"
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
