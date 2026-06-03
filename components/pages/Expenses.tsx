'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import Select from '@/components/ui/Select'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import Modal from '@/components/ui/Modal'
import RightDrawer from '@/components/ui/RightDrawer'
import EmptyState from '@/components/ui/EmptyState'
import CategoryPathStack from '@/components/ui/CategoryPathStack'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { formatBRL } from '@/lib/money'
import {
  formatDate,
  formatMonthYear,
  getCurrentMonth,
  getCurrentYear,
  getMonthLabel,
  getYearLabel,
  getYearRange,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { getBillingCycleRange, getCurrentBillingPeriod } from '@/lib/billing-cycle'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import DonutChart, { DonutSlice } from '@/components/ui/DonutChart'
import DonutCategoryModal from '@/components/ui/DonutCategoryModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from '@/components/ui/Toast'
import { buildInstallmentDates, splitAmountCents } from '@/lib/installments'
import { Calendar, Check, CheckCircle2, Clock, CreditCard, ChevronDown, Edit2, Download, FileDown, FileText, Maximize2, Paperclip, Receipt, SlidersHorizontal, Search, Plus, Upload, Users, X, Tag } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import FilterSheet from '@/components/layout/FilterSheet'
import { getAttachmentViewUrl, parseLegacyAttachment } from '@/lib/security/attachments'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import BankStatementImportModal from '@/components/bank-statements/BankStatementImportModal'
import {
  buildCategoryIconMap,
  buildCategoryLabelMap,
  buildCategoryOptions,
  CategoryRecord,
  findCategoryIdByStoredName,
} from '@/lib/categories'
import { matchesSearch } from '@/lib/filterSearch'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { buildBrandedPdfBlob, downloadBlob, downloadCsv, openHtmlAsPdf } from '@/lib/report-export'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
import { usePlan } from '@/lib/billing/plan-context'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

type PaymentMethod = 'PIX' | 'Credito' | 'Debito' | 'ValeAlimentacao'

interface DonutExpensePanelProps {
  slices: DonutSlice[]
  total: number
  expenses: { id: string; description: string; amount_cents: number; date: string; status: string; payment_method: string | null; category_name: string; category_id: string | null }[]
  getCategoryLabel: (id: string | null, name: string) => string
  getCatRailColor: (label: string) => string
}

function DonutExpensePanel({ slices, total, expenses, getCategoryLabel, getCatRailColor }: DonutExpensePanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const centerText = formatBRL(total).replace('R$ ', '').replace('R$ ', '')

  return (
    <>
      <div className="hidden md:block w-[300px] shrink-0">
        <div
          className="bg-white rounded-xl border border-border shadow-soft p-5 sticky top-4 cursor-pointer hover:shadow-vintage transition-vintage"
          onClick={() => setModalOpen(true)}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-[16px] text-coffee">Por categoria</h3>
            <Maximize2 className="w-3.5 h-3.5 text-ink/35" />
          </div>
          <DonutChart slices={slices} center={centerText} showLegend={false} />
          {/* Mini legend (top 4 only) */}
          <div className="mt-3 space-y-1.5">
            {slices.slice(0, 4).map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-[9px] h-[9px] rounded-[2px] shrink-0" style={{ background: s.color }} />
                <span className="flex-1 text-[12px] text-ink truncate">{s.label}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.pct}%</span>
              </div>
            ))}
            {slices.length > 4 && (
              <p className="text-[11px] text-ink/40 pt-0.5">+ {slices.length - 4} outras categorias</p>
            )}
          </div>
        </div>
      </div>

      <DonutCategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        slices={slices}
        total={total}
        expenses={expenses}
        getCategoryLabel={getCategoryLabel}
        getCatRailColor={getCatRailColor}
      />
    </>
  )
}

const CAT_RAIL_RULES: [RegExp, string][] = [
  [/^(Casa|Servi[çc]o|Conta|Aluguel)/i, '#3F6E7A'],
  [/^Aliment/i, '#6FBF8A'],
  [/^Lazer/i, '#C2A45D'],
  [/^(Transporte|Sa[úu]de|Farm)/i, '#B05C3A'],
  [/^Fam[íi]lia/i, '#3E5F4B'],
]
const CAT_RAIL_FALLBACK = ['#B05C3A', '#3F6E7A', '#6FBF8A', '#C2A45D', '#3E5F4B']

function getCatRailColor(label: string): string {
  const root = (label || '').split(' / ')[0].split(' > ')[0].trim()
  for (const [re, c] of CAT_RAIL_RULES) if (re.test(root)) return c
  let h = 0
  for (let i = 0; i < root.length; i++) h = (h * 31 + root.charCodeAt(i)) & 0xFFFFFF
  return CAT_RAIL_FALLBACK[Math.abs(h) % CAT_RAIL_FALLBACK.length]
}

const DONUT_PALETTE = ['#B05C3A', '#3F6E7A', '#6FBF8A', '#C2A45D', '#3E5F4B', '#7A66A1', '#3E8E5C', '#A58E5F']

const normalizePaymentMethod = (method: string | null): PaymentMethod | null => {
  if (method === 'PIX' || method === 'Credito' || method === 'Debito' || method === 'ValeAlimentacao') {
    return method
  }
  return null
}

interface Expense {
  id: string
  description: string
  category_id: string | null
  category_name: string
  amount_cents: number
  date: string
  status: 'open' | 'paid' | 'pending_confirmation'
  paid_at: string | null
  notes: string | null
  attachment_path: string | null
  payment_method: PaymentMethod | null
  installments: number | null
  installment_group_id: string | null
  installment_index: number | null
  created_by: string | null
}

const formatPaymentLabel = (method: PaymentMethod | null, installments: number | null) => {
  if (method === 'Credito') {
    const count = installments && installments > 1 ? `${installments}x` : ''
    return count ? `Credito ${count}` : 'Credito'
  }
  if (method === 'Debito') return 'Debito'
  if (method === 'PIX') return 'PIX'
  if (method === 'ValeAlimentacao') return 'Vale Alimentação'
  return 'Não definido'
}

function isDateInBillingPeriod(date: string, month: number, year: number, cycleDay: number): boolean {
  if (month === ALL_MONTHS_VALUE || year === ALL_YEARS_VALUE) return true
  const refMonth = `${year}-${String(month).padStart(2, '0')}`
  const { start, end } = getBillingCycleRange(cycleDay, refMonth)
  return date >= start && date <= end
}

export default function Expenses() {
  const { familyId, user } = useAuth()
  const { tier } = usePlan()
  const isFreeTier = tier === 'free'
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rawYearExpenses, setRawYearExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [billingCycleDay, setBillingCycleDay] = useState(1)

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [onlyInstallments, setOnlyInstallments] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Mobile UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<Map<string, string>>(new Map())
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [includeSignatures, setIncludeSignatures] = useState(true)
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)
  const [showPaywallModal, setShowPaywallModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form
  const RECURRENCE_OPTIONS = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'biweekly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'bimonthly', label: 'Bimestral' },
    { value: 'quarterly', label: 'Trimestral' },
    { value: 'semiannual', label: 'Semestral' },
    { value: 'annual', label: 'Anual' },
  ]

  const [formData, setFormData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'open' as 'open' | 'paid',
    notes: '',
    paymentMethod: 'PIX' as PaymentMethod,
    installments: 1,
    isRecurring: false,
    recurrenceFrequency: 'monthly',
  })
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null)
  const [categoryLimitInfo, setCategoryLimitInfo] = useState<{
    limitCents: number
    spentCents: number
    limitCategoryName: string
  } | null>(null)

  useEffect(() => {
    const catId = formData.categoryId
    if (!catId || !familyId) { setCategoryLimitInfo(null); return }
    const cat = categories.find(c => c.id === catId)
    if (!cat) { setCategoryLimitInfo(null); return }
    // Resolve effective limit: own limit or parent's limit
    let limitCents: number | null = cat.monthly_limit_cents ?? null
    let limitHolderId = catId
    let limitCategoryName = cat.name
    if (!limitCents && cat.parent_id) {
      const parent = categories.find(c => c.id === cat.parent_id)
      if (parent?.monthly_limit_cents) {
        limitCents = parent.monthly_limit_cents
        limitHolderId = parent.id
        limitCategoryName = parent.name
      }
    }
    if (!limitCents) { setCategoryLimitInfo(null); return }
    const limitedIds = [limitHolderId, ...categories.filter(c => c.parent_id === limitHolderId).map(c => c.id)]
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const captured = { limitCents, limitCategoryName }
    supabase
      .from('expenses')
      .select('amount_cents')
      .eq('family_id', familyId)
      .in('category_id', limitedIds)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .then(({ data }) => {
        const spent = (data ?? []).reduce((s, e) => s + (e.amount_cents ?? 0), 0)
        setCategoryLimitInfo({ limitCents: captured.limitCents, spentCents: spent, limitCategoryName: captured.limitCategoryName })
      })
  }, [formData.categoryId, familyId, categories])

  useEffect(() => {
    if (formData.categoryId) { setSuggestedCategoryId(null); return }
    const desc = formData.description.trim()
    if (desc.length < 2) { setSuggestedCategoryId(null); return }
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch('/api/suggest/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ description: desc, kind: 'expense' }),
        })
        const data = await res.json()
        if (data.categoryId && !formData.categoryId) setSuggestedCategoryId(data.categoryId)
      } catch { /* silent */ }
    }, 150)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.description])

  useEffect(() => {
    if (familyId) {
      // eslint-disable-next-line react-hooks/immutability
      loadCategories()
    }
  }, [familyId])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('billing_cycle_day')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.billing_cycle_day) {
          setBillingCycleDay(data.billing_cycle_day)
          const period = getCurrentBillingPeriod(data.billing_cycle_day)
          const [py, pm] = period.split('-').map(Number)
          setSelectedYear(py)
          setSelectedMonth(pm)
        }
      })
  }, [user?.id])

  useEffect(() => {
    if (!familyId) return
    supabase
      .from('users')
      .select('id,name')
      .eq('family_id', familyId)
      .then(({ data }) => {
        if (data) setFamilyMembers(new Map(data.map((u) => [u.id, u.name])))
      })
  }, [familyId])

  useEffect(() => {
    if (familyId) {
      // eslint-disable-next-line react-hooks/immutability
      loadExpenses()
    }
  }, [
    familyId,
    selectedMonth,
    selectedYear,
    selectedCategoryId,
    selectedStatus,
    selectedPaymentMethod,
    onlyInstallments,
    billingCycleDay,
  ])

  const categoryById = useMemo(
    () => new Map<string, CategoryRecord>(categories.map((category) => [category.id, category])),
    [categories]
  )
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories])
  const categoryIconMap = useMemo(() => buildCategoryIconMap(categories), [categories])
  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories])

  useEffect(() => {
    const stored = window.localStorage.getItem('app-filters-open')
    if (stored === '0') setFiltersOpen(false)
    if (stored === '1') setFiltersOpen(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('app-filters-open', filtersOpen ? '1' : '0')
  }, [filtersOpen])

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  useEffect(() => {
    if (!selectedCategoryId) return
    if (!categoryById.has(selectedCategoryId)) {
      setSelectedCategoryId('')
    }
  }, [selectedCategoryId, categoryById])

  const getCategoryLabel = (categoryId: string | null, fallbackName: string) => {
    if (categoryId) {
      return categoryLabelMap.get(categoryId) || fallbackName
    }
    return fallbackName
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system,icon,monthly_limit_cents')
      .eq('family_id', familyId!)
      .eq('kind', 'expense')
      .order('name')

    setCategories((data || []) as CategoryRecord[])
  }

  async function loadExpenses() {
    setLoading(true)
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId!)

    if (selectedYear !== ALL_YEARS_VALUE) {
      const { start, end } = getYearRange(selectedYear)
      query = query
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
    }

    query = query.order('date', { ascending: false }).limit(2000)

    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId)
    }

    if (selectedStatus) {
      query = query.eq('status', selectedStatus)
    }

    if (selectedPaymentMethod) {
      query = query.eq('payment_method', selectedPaymentMethod)
    }

    if (onlyInstallments) {
      query = query.eq('payment_method', 'Credito').gt('installments', 1)
    }

    const { data } = await query

    if (data) {
      const normalized: Expense[] = data.map((row) => ({
        id: row.id,
        description: row.description,
        category_id: row.category_id,
        category_name: row.category_name,
        amount_cents: row.amount_cents,
        date: row.date,
        status: row.status === 'paid' ? 'paid' : row.status === 'pending_confirmation' ? 'pending_confirmation' : 'open',
        paid_at: row.paid_at,
        notes: row.notes,
        attachment_path: row.attachment_path ?? null,
        payment_method: normalizePaymentMethod(row.payment_method),
        installments: row.installments || 1,
        installment_group_id: row.installment_group_id,
        installment_index: row.installment_index,
        created_by: row.created_by ?? null,
      }))
      setRawYearExpenses(normalized)
      setExpenses(normalized.filter((expense) => isDateInBillingPeriod(expense.date, selectedMonth, selectedYear, billingCycleDay)))
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const paymentMethod = formData.paymentMethod
    const installments = paymentMethod === 'Credito' ? Math.max(1, formData.installments) : 1
    const category = categoryById.get(formData.categoryId)
    const categoryLabel = category ? (categoryLabelMap.get(category.id) || category.name) : null

    if (!category || !categoryLabel) {
      setFormError('Selecione uma categoria válida.')
      return
    }
    setFormError(null)

    const expenseData = {
      family_id: familyId!,
      description: formData.description,
      category_id: category.id,
      category_name: categoryLabel,
      amount_cents: amountCents,
      date: formData.date,
      status: formData.status,
      paid_at: formData.status === 'paid' ? new Date().toISOString() : null,
      notes: formData.notes || null,
      attachment_path: editingExpense?.attachment_path ?? currentAttachmentUrl,
      payment_method: paymentMethod,
      installments,
      installment_group_id: editingExpense?.installment_group_id || null,
      installment_index: editingExpense?.installment_index || null,
    }
    if (paymentMethod !== 'Credito') {
      expenseData.installment_group_id = null
      expenseData.installment_index = null
    }

    if (editingExpense) {
      if (paymentMethod === 'Credito' && installments > 1) {
        const amounts = splitAmountCents(amountCents, installments)
        const dates = buildInstallmentDates(formData.date, installments)
        const groupId = crypto.randomUUID()

        if (editingExpense.installment_group_id) {
          await supabase
            .from('expenses')
            .delete()
            .eq('installment_group_id', editingExpense.installment_group_id)
        } else {
          await supabase.from('expenses').delete().eq('id', editingExpense.id)
        }

        const rows = amounts.map((amount, index) => ({
          ...expenseData,
          amount_cents: amount,
          date: dates[index],
          installment_group_id: groupId,
          installment_index: index + 1,
          created_by: user?.id ?? null,
        }))
        await supabase.from('expenses').insert(rows)
      } else {
        if (paymentMethod === 'Credito' && !expenseData.installment_group_id) {
          expenseData.installment_group_id = crypto.randomUUID()
          expenseData.installment_index = 1
        }
        if (editingExpense.installment_group_id) {
          await supabase
            .from('expenses')
            .delete()
            .eq('installment_group_id', editingExpense.installment_group_id)
            .neq('id', editingExpense.id)
        }
        await supabase
          .from('expenses')
          .update({ ...expenseData, updated_at: new Date().toISOString() })
          .eq('id', editingExpense.id)
        // Optimistic: update only this record in state
        const updated = { ...editingExpense, ...expenseData } as Expense
        setExpenses((prev) => prev.map((e) => e.id === editingExpense.id ? updated : e))
        setRawYearExpenses((prev) => prev.map((e) => e.id === editingExpense.id ? updated : e))
        closeModal()
        return
      }
    } else {
      if (paymentMethod === 'Credito' && installments > 1) {
        const amounts = splitAmountCents(amountCents, installments)
        const dates = buildInstallmentDates(formData.date, installments)
        const groupId = crypto.randomUUID()
        const rows = amounts.map((amount, index) => ({
          ...expenseData,
          amount_cents: amount,
          date: dates[index],
          installment_group_id: groupId,
          installment_index: index + 1,
          created_by: user?.id ?? null,
        }))
        await supabase.from('expenses').insert(rows)
      } else {
        if (paymentMethod === 'Credito') {
          expenseData.installment_group_id = crypto.randomUUID()
          expenseData.installment_index = 1
        }
        const { data: newRow } = await supabase.from('expenses').insert({ ...expenseData, created_by: user?.id ?? null }).select().maybeSingle()
        if (newRow) {
          setExpenses((prev) => [newRow as Expense, ...prev])
          setRawYearExpenses((prev) => [newRow as Expense, ...prev])
          if (expenses.length === 0) posthog.capture(EVENTS.FIRST_EXPENSE_CREATED)
          closeModal()
          return
        }
      }
    }

    if (!editingExpense && expenses.length === 0) posthog.capture(EVENTS.FIRST_EXPENSE_CREATED)

    if (formData.isRecurring && !editingExpense) {
      const dateObj = new Date(formData.date)
      const freq = formData.recurrenceFrequency
      const freqDays: Record<string, number> = { weekly:7,biweekly:14,monthly:30,bimonthly:60,quarterly:91,semiannual:182,annual:365 }
      const nextDate = new Date(dateObj)
      nextDate.setDate(nextDate.getDate() + (freqDays[freq] ?? 30))
      const toISO = (d: Date) => d.toISOString().slice(0, 10)
      await supabase.from('recurring_patterns').upsert(
        {
          family_id: familyId!,
          description_pattern: formData.description.toLowerCase().trim(),
          kind: 'expense',
          category_id: category.id,
          estimated_amount_cents: amountCents,
          frequency: freq,
          source: 'user',
          day_of_month: Math.min(dateObj.getDate(), 28),
          last_occurrence_date: formData.date,
          next_expected_date: toISO(nextDate),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,description_pattern,kind' }
      )
    }

    closeModal()
    loadExpenses()

    // Fire-and-forget limit alert check
    if (familyId && category?.id) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return
        fetch('/api/categories/limit-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ familyId, categoryId: category.id }),
        }).catch(() => {/* silent */})
      })
    }
  }

  const handleDelete = (id: string) => {
    if (updatingIds.includes(id)) return
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    setUpdatingIds((prev) => [...prev, deleteConfirmId])
    await supabase.from('expenses').delete().eq('id', deleteConfirmId)
    setUpdatingIds((prev) => prev.filter((item) => item !== deleteConfirmId))
    setExpenses((prev) => prev.filter((e) => e.id !== deleteConfirmId))
    setRawYearExpenses((prev) => prev.filter((e) => e.id !== deleteConfirmId))
    setDeleting(false)
    setDeleteConfirmId(null)
  }

  const handleTogglePaid = async (expense: Expense) => {
    if (updatingIds.includes(expense.id)) return
    const nextStatus = expense.status === 'paid' ? 'open' : 'paid'
    const now = new Date().toISOString()
    const nextPaidAt = nextStatus === 'paid' ? now : null

    // Optimistic update — no full reload
    const applyUpdate = (arr: Expense[]) =>
      arr.map((e) => e.id === expense.id ? { ...e, status: nextStatus as Expense['status'], paid_at: nextPaidAt } : e)
    setExpenses(applyUpdate)
    setRawYearExpenses(applyUpdate)

    setUpdatingIds((prev) => [...prev, expense.id])
    await supabase
      .from('expenses')
      .update({ status: nextStatus, paid_at: nextPaidAt, updated_at: now })
      .eq('id', expense.id)
    setUpdatingIds((prev) => prev.filter((item) => item !== expense.id))
  }

  const openDetails = (expense: Expense) => {
    openModal(expense)
  }

  const handleAttachExpense = async (expense: Expense, file: File) => {
    if (!familyId) return

    const form = new FormData()
    form.append('file', file)
    form.append('recordType', 'expense')
    form.append('recordId', expense.id)

    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch('/api/attachments/upload', {
      method: 'POST',
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined,
      body: form,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      toast(body?.error ?? 'Erro ao enviar arquivo. Tente novamente.', { type: 'error' })
      return
    }

    loadExpenses()
  }

  const openModal = (expense?: Expense) => {
    if (expense) {
      const { cleanNotes } = parseLegacyAttachment(expense.notes)
      setEditingExpense(expense)
      setCurrentAttachmentUrl(expense.attachment_path ?? null)
      setFormData({
        description: expense.description,
        categoryId: expense.category_id || findCategoryIdByStoredName(categories, expense.category_name) || '',
        amount: (expense.amount_cents / 100).toFixed(2),
        date: expense.date,
        status: expense.status === 'paid' ? 'paid' : 'open',
        notes: cleanNotes || '',
        paymentMethod: expense.payment_method || 'PIX',
        installments: expense.installments || 1,
        isRecurring: false,
        recurrenceFrequency: 'monthly',
      })
    } else {
      setEditingExpense(null)
      setCurrentAttachmentUrl(null)
      setFormData({
        description: '',
        categoryId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'open',
        notes: '',
        paymentMethod: 'PIX',
        installments: 1,
        isRecurring: false,
        recurrenceFrequency: 'monthly',
      })
    }
    loadCategories()  // always refresh so latest limits are loaded
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
    setCurrentAttachmentUrl(null)
    setFormError(null)
  }

  // Cálculos
  const filteredExpenses = expenses.filter((expense) =>
    matchesSearch(
      searchTerm,
      expense.description,
      getCategoryLabel(expense.category_id, expense.category_name)
    )
  )
  const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount_cents, 0)
  const paid = filteredExpenses
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount_cents, 0)
  const open = total - paid

  // Analytics computations
  const dailyAverage = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedYear === ALL_YEARS_VALUE) return 0
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    return daysInMonth > 0 ? Math.round(total / daysInMonth) : 0
  }, [total, selectedMonth, selectedYear])

  const prevMonthTotal = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedMonth === 1 || selectedYear === ALL_YEARS_VALUE) return null
    const prevM = selectedMonth - 1
    return rawYearExpenses
      .filter((e) => isDateInBillingPeriod(e.date, prevM, selectedYear, billingCycleDay))
      .reduce((s, e) => s + e.amount_cents, 0)
  }, [rawYearExpenses, selectedMonth, selectedYear, billingCycleDay])

  const prevMonthLabel = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedMonth === 1) return null
    return `${getMonthLabel(selectedMonth - 1).slice(0, 3)}/${selectedYear}`
  }, [selectedMonth, selectedYear])

  const totalDeltaPct = prevMonthTotal != null && prevMonthTotal > 0
    ? Math.round(((total - prevMonthTotal) / prevMonthTotal) * 100)
    : null

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      const label = getCategoryLabel(e.category_id, e.category_name)
      map.set(label, (map.get(label) || 0) + e.amount_cents)
    })
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses])

  const expenseDonutSlices: DonutSlice[] = useMemo(() => {
    if (total === 0) return []
    return categoryBreakdown.slice(0, 8).map((c, i) => ({
      label: c.label,
      value: c.value,
      pct: Math.round((c.value / total) * 100),
      color: getCatRailColor(c.label) || DONUT_PALETTE[i % DONUT_PALETTE.length],
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryBreakdown, total])

  const paidCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.filter(e => e.status === 'paid').forEach((e) => {
      const label = getCategoryLabel(e.category_id, e.category_name)
      map.set(label, (map.get(label) || 0) + e.amount_cents)
    })
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses])

  const openCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    filteredExpenses.filter(e => e.status === 'open').forEach((e) => {
      const label = getCategoryLabel(e.category_id, e.category_name)
      map.set(label, (map.get(label) || 0) + e.amount_cents)
    })
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExpenses])


  const monthLabel = selectedMonth !== ALL_MONTHS_VALUE
    ? getMonthLabel(selectedMonth)
    : 'Todos os meses'
  const [visibleCount, setVisibleCount] = useState(30)
  const sortedExpenses = filteredExpenses.slice().sort((a, b) => b.date.localeCompare(a.date))
  const visibleExpenses = sortedExpenses.slice(0, visibleCount)
  const hasMore = sortedExpenses.length > visibleCount
  const groupedExpenses = visibleExpenses.reduce<Array<{ label: string; items: Expense[] }>>((groups, expense) => {
    const label = formatMonthYear(expense.date)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(expense)
      return groups
    }
    groups.push({ label, items: [expense] })
    return groups
  }, [])
  const activeFiltersCount = [
    selectedMonth !== getCurrentMonth(),
    selectedYear !== getCurrentYear(),
    selectedCategoryId !== '',
    selectedStatus !== '',
    selectedPaymentMethod !== '',
    onlyInstallments,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    setSelectedCategoryId('')
    setSelectedStatus('')
    setSelectedPaymentMethod('')
    setOnlyInstallments(false)
    setVisibleCount(30)
  }
  const activeFilterChips = [
    {
      key: 'month',
      label: getMonthLabel(selectedMonth),
      onRemove: () => setSelectedMonth(getCurrentMonth()),
      disabled: selectedMonth === getCurrentMonth(),
    },
    {
      key: 'year',
      label: getYearLabel(selectedYear),
      onRemove: () => setSelectedYear(getCurrentYear()),
      disabled: selectedYear === getCurrentYear(),
    },
    ...(selectedCategoryId
      ? [{
          key: 'category',
          label: getCategoryLabel(selectedCategoryId, 'Categoria'),
          onRemove: () => setSelectedCategoryId(''),
        }]
      : []),
    ...(selectedStatus
      ? [{
          key: 'status',
          label: selectedStatus === 'paid' ? 'Pago' : 'Em aberto',
          onRemove: () => setSelectedStatus(''),
        }]
      : []),
    ...(selectedPaymentMethod
      ? [{
          key: 'method',
          label: selectedPaymentMethod,
          onRemove: () => setSelectedPaymentMethod(''),
        }]
      : []),
    ...(onlyInstallments
      ? [{
          key: 'installments',
          label: 'Somente parceladas',
          onRemove: () => setOnlyInstallments(false),
        }]
      : []),
  ]

  const exportRows = sortedExpenses.map((expense) => [
    formatDate(expense.date),
    expense.description,
    getCategoryLabel(expense.category_id, expense.category_name),
    expense.status === 'paid' ? 'Pago' : 'Em aberto',
    formatPaymentLabel(expense.payment_method, expense.installments),
    expense.installments && expense.installments > 1 ? `${expense.installments}x` : '',
    formatBRL(expense.amount_cents),
    expense.paid_at ? formatDate(expense.paid_at) : '',
    expense.notes || '',
  ])

  const exportSubtitle = [
    `Período: ${selectedMonth === ALL_MONTHS_VALUE ? 'todos os meses' : getMonthLabel(selectedMonth)} / ${selectedYear === ALL_YEARS_VALUE ? 'todos os anos' : getYearLabel(selectedYear)}`,
    selectedCategoryId ? `Categoria: ${getCategoryLabel(selectedCategoryId, 'Categoria')}` : null,
    selectedStatus ? `Status: ${selectedStatus === 'paid' ? 'Pago' : 'Em aberto'}` : null,
    selectedPaymentMethod ? `Método: ${selectedPaymentMethod}` : null,
    onlyInstallments ? 'Apenas parceladas' : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `despesas-${format(new Date(), 'yyyy-MM-dd')}`,
    title: 'Despesas',
    subtitle: exportSubtitle,
    headers: ['Data', 'Descrição', 'Categoria', 'Status', 'Método', 'Parcelas', 'Valor', 'Pago em', 'Observações'],
    rows: exportRows,
  }

  const buildFilterSummary = () => {
    const monthLabel = selectedMonth === ALL_MONTHS_VALUE ? null : getMonthLabel(selectedMonth)
    const yearLabel = selectedYear === ALL_YEARS_VALUE ? null : String(selectedYear)
    const categoryLabel = selectedCategoryId ? getCategoryLabel(selectedCategoryId, 'Categoria') : null
    const statusLabel = selectedStatus === 'paid' ? 'Pago' : selectedStatus === 'open' ? 'Em aberto' : null
    const methodLabel = selectedPaymentMethod || null
    const installmentsLabel = onlyInstallments ? 'Somente parceladas' : null

    const parts = [
      monthLabel || 'Todos os meses',
      yearLabel ? `Ano ${yearLabel}` : 'Todos os anos',
      categoryLabel ? `Categoria: ${categoryLabel}` : 'Todas as categorias',
      statusLabel ? `Status: ${statusLabel}` : 'Todos os status',
      methodLabel ? `Método: ${methodLabel}` : null,
      installmentsLabel,
    ].filter(Boolean)

    return parts.length ? parts.join(' • ') : 'Sem filtros ativos'
  }

  const generatePdfBlob = async (expensesOverride = sortedExpenses, includeSignatureOverride = includeSignatures) => {
    const totalCents = expensesOverride.reduce((sum, e) => sum + e.amount_cents, 0)
    const paidCents = expensesOverride
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + e.amount_cents, 0)

    return buildBrandedPdfBlob({
      title: 'Registro de Despesas',
      filterSummary: buildFilterSummary(),
      headers: ['Data', 'Descricao', 'Categoria', 'Status', 'Metodo', 'Parcelas', 'Pago em', 'Observacao', 'Valor'],
      rows: expensesOverride.map((expense) => [
        formatDate(expense.date),
        expense.description,
        getCategoryLabel(expense.category_id, expense.category_name),
        expense.status === 'paid' ? 'Pago' : expense.status === 'pending_confirmation' ? 'Aguardando confirmação' : 'Em aberto',
        formatPaymentLabel(expense.payment_method, expense.installments),
        expense.installments && expense.installments > 1 ? `${expense.installments}x` : '',
        expense.paid_at ? formatDate(expense.paid_at) : '',
        expense.notes || '',
        formatBRL(expense.amount_cents),
      ]),
      cards: [
        { label: 'TOTAL', value: formatBRL(totalCents) },
        { label: 'PAGO', value: formatBRL(paidCents) },
        { label: 'EM ABERTO', value: formatBRL(totalCents - paidCents) },
      ],
      generatedDate: formatDate(new Date()),
      includeSignatures: includeSignatureOverride,
      accentColor: '#B05C3A',
    })
  }

  const updatePdfUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  const closePdfModal = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
    setPdfUrl('')
    setIsPdfModalOpen(false)
  }

  const openPdfPreview = async () => {
    setExportingFormat('pdf')
    setPdfUrl('')
    setIsPdfModalOpen(true)
    try {
      const blob = await generatePdfBlob()
      updatePdfUrl(blob)
    } finally {
      setExportingFormat(null)
    }
  }

  const refreshPdfPreview = async (nextIncludeSignatures: boolean) => {
    const blob = await generatePdfBlob(sortedExpenses, nextIncludeSignatures)
    updatePdfUrl(blob)
  }

  const downloadPreviewPdf = async () => {
    const url = pdfUrl || URL.createObjectURL(await generatePdfBlob())
    openHtmlAsPdf(url)
  }

  const checkExportLimit = async (): Promise<boolean> => {
    if (!isFreeTier) return true
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const res = await fetch('/api/billing/usage/export-import', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const data = await res.json()
    if (!data.allowed) {
      posthog.capture(EVENTS.EXPORT_IMPORT_LIMIT_REACHED)
      setShowPaywallModal(true)
      return false
    }
    return true
  }

  const handleExportCsv = async () => {
    if (!exportRows.length) return
    if (!(await checkExportLimit())) return
    setExportingFormat('csv')
    try {
      downloadCsv({ ...exportTable, filename: `${exportTable.filename}.csv` })
    } finally {
      setExportingFormat(null)
    }
  }

  const handleExportPdf = async () => {
    if (!exportRows.length) return
    if (!(await checkExportLimit())) return
    await openPdfPreview()
  }

  return (
    <div className="flex flex-col h-full md:min-h-screen">
      <Topbar
        title="Contas a Pagar"
        subtitle="Compromissos honrados constroem segurança."
        accent="#B05C3A"
        variant="textured"
      />

      {/* Mobile filter bar */}
        <div className="md:hidden relative border-b border-border bg-offWhite px-[18px] py-[10px] flex gap-[9px] items-center shrink-0">
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex items-center gap-1.5 h-[38px] px-3 rounded-[10px] border border-border bg-bg text-ink text-sm font-medium min-w-0 max-w-[150px] overflow-hidden shrink"
          >
            <SlidersHorizontal className="w-4 h-4 text-petrol shrink-0" />
            <span className="leading-tight text-left truncate">
              {selectedMonth === ALL_MONTHS_VALUE
                ? (selectedYear === ALL_YEARS_VALUE ? 'Todos' : `Todos os meses`)
                : `${getMonthLabel(selectedMonth).slice(0, 3)}${selectedYear === ALL_YEARS_VALUE ? ' • Todos os anos' : ` ${selectedYear}`}`}
            </span>
          </button>

          {mobileSearchExpanded ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex items-center relative">
                <Search className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-petrol" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  autoFocus
                  className="h-[38px] w-full rounded-[10px] border border-border bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-petrol/30"
                />
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchExpanded(false); setSearchTerm('') }}
                className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
                aria-label="Fechar busca"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCategorySettingsOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-[38px] px-3 rounded-[10px] border border-border bg-bg text-petrol text-sm font-medium"
              >
                <Tag className="w-4 h-4" />
                <span>Categorias</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileSearchExpanded(true)}
                className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

        <button
          type="button"
          onClick={() => setAddMenuOpen((prev) => !prev)}
          className="w-[38px] h-[38px] rounded-[10px] bg-coffee text-paper flex items-center justify-center shrink-0"
          aria-label="Adicionar"
        >
          <Plus className="w-5 h-5" />
        </button>
        {addMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-64 overflow-hidden animate-popup-in">
              <button
                onClick={() => { openModal(); setAddMenuOpen(false) }}
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Adicionar manualmente</p>
                  <p className="text-xs text-ink/45">Preencher um formulário</p>
                </div>
              </button>
              <button
                onClick={() => { setIsImportModalOpen(true); setAddMenuOpen(false) }}
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Importar extrato</p>
                  <p className="text-xs text-ink/45">OFX, CSV de banco</p>
                </div>
              </button>
              <button
                onClick={() => { setIsCategorySettingsOpen(true); setAddMenuOpen(false) }}
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Categorias</p>
                  <p className="text-xs text-ink/45">Gerenciar categorias</p>
                </div>
              </button>
              <button
                onClick={() => { handleExportCsv(); setAddMenuOpen(false) }}
                disabled={!sortedExpenses.length || exportingFormat !== null}
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3 disabled:opacity-40"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <FileDown className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Exportar CSV</p>
                  <p className="text-xs text-ink/45">Planilha com os dados</p>
                </div>
              </button>
              <button
                onClick={() => { handleExportPdf(); setAddMenuOpen(false) }}
                disabled={!sortedExpenses.length || exportingFormat !== null}
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage flex items-center gap-3 disabled:opacity-40"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Exportar PDF</p>
                  <p className="text-xs text-ink/45">Relatório para imprimir</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop toolbar */}
      <div className="hidden md:flex items-center gap-2.5 px-6 py-3 border-b border-border bg-bg">
        <button
          onClick={() => setFiltersOpen(prev => !prev)}
          className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] border border-border bg-white text-ink text-[13px] font-medium hover:bg-paper transition-vintage"
        >
          <SlidersHorizontal className="w-4 h-4 text-petrol" />
          {selectedMonth === ALL_MONTHS_VALUE
            ? (selectedYear === ALL_YEARS_VALUE ? 'Todos' : String(selectedYear))
            : `${getMonthLabel(selectedMonth).slice(0, 3)} ${selectedYear !== ALL_YEARS_VALUE ? selectedYear : ''}`}
          <ChevronDown className={`w-3.5 h-3.5 text-ink/40 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center h-[38px] bg-white border border-border rounded-[10px] px-3 gap-2 flex-1 max-w-[380px]">
          <Search className="w-4 h-4 text-petrol shrink-0" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou categoria..."
            className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink/40 outline-none"
          />
        </div>
        <div className="flex-1" />
        <button onClick={() => setIsCategorySettingsOpen(true)} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage">
          <Tag className="w-4 h-4" /> Categorias
        </button>
        <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage">
          <Download className="w-4 h-4" /> Importar
        </button>
        <button onClick={handleExportPdf} disabled={!sortedExpenses.length || exportingFormat !== null} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage disabled:opacity-40">
          <Upload className="w-4 h-4" /> Exportar
        </button>
        <button onClick={() => openModal()} className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] text-white text-[13px] font-semibold transition-vintage" style={{ background: '#B05C3A' }}>
          <Plus className="w-4 h-4" /> Nova despesa
        </button>
      </div>

      {/* Desktop filter panel — OUTSIDE scroll area so dropdowns don't clip */}
      {filtersOpen && (
        <div className="hidden md:block bg-bg/60 border-b border-border">
          <div className="px-6 py-3 flex flex-wrap gap-3 items-end">
              <MonthYearPicker
                month={selectedMonth}
                year={selectedYear}
                onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
              />
              <div className="min-w-[160px] max-w-[260px]">
                <Select
                  variant="filter"
                  label="Categoria"
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                  options={[{ value: '', label: 'Todas' }, ...categoryOptions]}
                />
              </div>
              <div className="min-w-[160px]">
                <Select
                  variant="filter"
                  label="Status"
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  options={[{ value: '', label: 'Todos' }, { value: 'paid', label: 'Pago' }, { value: 'open', label: 'Em aberto' }]}
                />
              </div>
              <div className="min-w-[160px]">
                <Select
                  variant="filter"
                  label="Método"
                  value={selectedPaymentMethod}
                  onChange={setSelectedPaymentMethod}
                  options={[{ value: '', label: 'Todos' }, { value: 'PIX', label: 'PIX' }, { value: 'Credito', label: 'Crédito' }, { value: 'Debito', label: 'Débito' }]}
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyInstallments}
                  onClick={() => setOnlyInstallments(v => !v)}
                  className="relative w-8 h-[18px] rounded-full transition-colors shrink-0"
                  style={{ background: onlyInstallments ? '#3F6E7A' : '#E4D7C2' }}
                >
                  <span
                    className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
                    style={{ left: onlyInstallments ? '18px' : '2px' }}
                  />
                </button>
                Somente parceladas
              </label>
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-terracotta hover:underline">Limpar filtros</button>
              )}
          </div>
        </div>
      )}

      {/* Scrollable cards area */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible">
        <div className="w-full flex flex-col">
          <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-6 md:pt-4 md:pb-4">
            {/* ── KPI row ── */}
            {!loading && filteredExpenses.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <AnalyticsKpiCard
                  label="Total de Despesas"
                  value={formatBRL(total)}
                  sub={totalDeltaPct != null ? `${totalDeltaPct >= 0 ? '↑' : '↓'} ${Math.abs(totalDeltaPct)}% vs ${prevMonthLabel}` : undefined}
                  subNegative={totalDeltaPct != null && totalDeltaPct > 0}
                  iconTheme="red"
                  icon={Receipt}
                />
                <AnalyticsKpiCard
                  label="Pagas"
                  value={formatBRL(paid)}
                  sub={total > 0 ? `${Math.round((paid / total) * 100)}% do total` : undefined}
                  subPositive
                  iconTheme="green"
                  icon={CheckCircle2}
                />
                <AnalyticsKpiCard
                  label="Em aberto"
                  value={formatBRL(open)}
                  sub={total > 0 ? `${Math.round((open / total) * 100)}% do total` : undefined}
                  iconTheme="orange"
                  icon={Clock}
                />
                <AnalyticsKpiCard
                  label="Categorias ativas"
                  value={String(expenseDonutSlices.length)}
                  sub={`${sortedExpenses.length} lançamentos`}
                  iconTheme="purple"
                  icon={Tag}
                />
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-16 h-16" />}
                message="Ainda não há despesas aqui, um bom começo."
                submessage="Use o botão + para adicionar uma despesa."
              />
            ) : (
              <div className="flex flex-col md:flex-row gap-5">
                {/* Left: Donut chart — desktop only */}
                {expenseDonutSlices.length > 0 && (
                  <DonutExpensePanel
                    slices={expenseDonutSlices}
                    total={total}
                    expenses={filteredExpenses}
                    getCategoryLabel={getCategoryLabel}
                    getCatRailColor={getCatRailColor}
                  />
                )}

                {/* Right: List */}
                <div className="flex-1 min-w-0 space-y-5">
                {/* Pending confirmation banner */}
                {filteredExpenses.some(e => e.status === 'pending_confirmation') && (() => {
                  const count = filteredExpenses.filter(e => e.status === 'pending_confirmation').length
                  return (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: 'rgba(176,92,58,0.06)', borderColor: 'rgba(176,92,58,0.2)' }}>
                      <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(176,92,58,0.12)', color: '#B05C3A' }}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: '#B05C3A' }}>
                          {count} despesa{count !== 1 ? 's' : ''} recorrente{count !== 1 ? 's' : ''} para confirmar
                        </p>
                        <p className="text-xs text-ink/55 mt-0.5">
                          Pré-registramos com base em meses anteriores. Confirme para incluir no orçamento.
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedStatus('pending_confirmation' as unknown as string)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-vintage"
                        style={{ borderColor: 'rgba(176,92,58,0.3)', color: '#B05C3A', background: '#fff' }}
                      >
                        Revisar →
                      </button>
                    </div>
                  )
                })()}
                {groupedExpenses.map((group) => (
                  <div key={group.label} className="space-y-3">
                    {groupedExpenses.length > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1" style={{ background: 'rgba(176,92,58,0.2)' }} />
                        <span
                          className="rounded-full border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] shadow-sm"
                          style={{
                            borderColor: 'rgba(176,92,58,0.3)',
                            background: 'rgba(176,92,58,0.05)',
                            color: 'rgba(176,92,58,0.8)',
                          }}
                        >
                          {group.label}
                        </span>
                        <div className="h-px flex-1" style={{ background: 'rgba(176,92,58,0.2)' }} />
                      </div>
                    )}
                    <div className="space-y-3">
                      {group.items.map((expense) => {
                        const isUpdating = updatingIds.includes(expense.id)
                        const catLabel = getCategoryLabel(expense.category_id, expense.category_name)
                        const catParts = catLabel ? catLabel.split(' / ') : []
                        const catIcon = expense.category_id ? categoryIconMap.get(expense.category_id) : null
                        const isPaid = expense.status === 'paid'
                        const isPending = expense.status === 'pending_confirmation'
                        const railColor = getCatRailColor(catLabel)
                        const methodLabel = expense.payment_method === 'Credito' ? 'Crédito'
                          : expense.payment_method === 'Debito' ? 'Débito'
                          : expense.payment_method === 'ValeAlimentacao' ? 'Vale'
                          : expense.payment_method ?? ''
                        const installmentBadge = expense.payment_method === 'Credito' && expense.installments && expense.installments > 1
                          ? `${expense.installment_index ?? 1}/${expense.installments}x` : null
                        const isOverdue = !isPaid && !isPending && expense.date < new Date().toISOString().slice(0, 10)
                        const statusLabel = isPaid ? 'PAGO' : isPending ? 'A CONFIRMAR' : isOverdue ? 'ATRASADO' : 'EM ABERTO'
                        const statusBg = isPaid ? 'rgba(111,191,138,0.18)' : isPending ? 'rgba(47,111,126,0.15)' : isOverdue ? 'rgba(176,92,58,0.18)' : 'rgba(194,164,93,0.22)'
                        const statusFg = isPaid ? '#3E8E5C' : isPending ? '#2F6F7E' : isOverdue ? '#B05C3A' : '#A58E5F'
                        return (
                          <div
                            id={`expense-${expense.id}`}
                            key={expense.id}
                            className={`transition-vintage ${isUpdating ? 'opacity-60' : ''}`}
                          >
                            {/* ── MOBILE card ── */}
                            <div className={`md:hidden rounded-xl overflow-hidden border shadow-sm flex ${isPending ? 'border-petrol/40 bg-petrol/5' : 'border-border bg-offWhite'}`}>
                              <div className={`w-[3px] shrink-0 ${isPaid ? 'bg-olive' : isPending ? 'bg-petrol' : 'bg-amber-400'}`} />
                              <div className="flex-1 p-3 min-w-0 space-y-2">
                                {/* Row 1: checkbox + icon + title + menu */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePaid(expense)}
                                    disabled={isUpdating}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage disabled:opacity-50 ${
                                      isPaid ? 'border-olive bg-olive' : 'border-border bg-transparent'
                                    }`}
                                    aria-label={`Marcar ${expense.description} como ${isPaid ? 'em aberto' : 'pago'}`}
                                  >
                                    {isPaid && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                  {catIcon && <CategoryIcon name={catIcon} className="w-4 h-4 shrink-0 text-ink/40" />}
                                  <h4 className={`flex-1 min-w-0 text-base font-medium font-serif truncate ${isPaid ? 'line-through text-sidebar/50 decoration-sidebar/30' : 'text-sidebar'}`}>
                                    {expense.description}
                                  </h4>
                                  <ActionMenu
                                    onView={() => openDetails(expense)}
                                    onEdit={() => openModal(expense)}
                                    onDelete={() => handleDelete(expense.id)}
                                    onAttach={(file) => handleAttachExpense(expense, file)}
                                    onToggleStatus={() => handleTogglePaid(expense)}
                                    toggleStatusLabel={isPaid ? 'Marcar como Em aberto' : 'Marcar como Pago'}
                                    disabled={isUpdating}
                                  />
                                </div>

                                {/* Row 2: status badge + date */}
                                <div className="flex items-center justify-between">
                                  {isPaid ? (
                                    <span className="rounded-full bg-olive/15 px-2.5 py-0.5 text-[11px] font-semibold text-olive">Pago</span>
                                  ) : isPending ? (
                                    <span className="rounded-full bg-petrol/10 border border-petrol/30 px-2.5 py-0.5 text-[11px] font-semibold text-petrol">Aguardando confirmação</span>
                                  ) : (
                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">Em aberto</span>
                                  )}
                                  <div className="flex items-center gap-1 text-ink/50 text-[11px]">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(expense.date)}</span>
                                  </div>
                                </div>

                                <div className="h-px bg-border/50" />

                                {/* Row 3: VALOR + amount */}
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-ink/40 font-medium">Valor</p>
                                  <p className={`font-numbers text-xl font-semibold ${isPaid ? 'text-olive' : 'text-sidebar'}`}>
                                    {formatBRL(expense.amount_cents)}
                                  </p>
                                </div>

                                {/* Row 4: category + no-method warning */}
                                {(catParts.length > 0 || expense.payment_method === null) && (
                                  <div className="flex items-center justify-between gap-2">
                                    {catParts.length > 0 && (
                                      <div className="flex items-center gap-1 text-[11px] text-ink/50 min-w-0">
                                        {catIcon && <CategoryIcon name={catIcon} className="w-3.5 h-3.5 shrink-0 text-ink/40" />}
                                        <span className="truncate">{catParts[0]}</span>
                                        {catParts[1] && (
                                          <>
                                            <span className="text-ink/30 shrink-0">›</span>
                                            <span className="truncate">{catParts[1]}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    {expense.payment_method === null && (
                                      <span
                                        title="Método de pagamento não definido. Edite para definir."
                                        className="text-[10px] text-amber-600 border border-amber-400/40 rounded px-1.5 py-0.5 shrink-0 cursor-help"
                                      >
                                        ⚠ Sem método
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── DESKTOP card (ExpenseRow2) ── */}
                            <div
                              className="hidden md:flex items-stretch rounded-[10px] bg-white border border-border hover:shadow-soft transition-vintage cursor-pointer"
                              onClick={() => openModal(expense)}
                            >
                              {/* Left rail */}
                              <div className="w-1 shrink-0 self-stretch rounded-l-[9px]" style={{ background: railColor }} />
                              {/* Content row */}
                              <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
                                {/* Checkbox */}
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); handleTogglePaid(expense) }}
                                  disabled={isUpdating}
                                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-vintage disabled:opacity-50 ${
                                    isPaid ? 'border-olive bg-olive' : 'border-border bg-transparent hover:border-olive'
                                  }`}
                                  aria-label={`Marcar como ${isPaid ? 'em aberto' : 'pago'}`}
                                >
                                  {isPaid && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                </button>
                                {/* Title + category */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: `${railColor}18`, color: railColor }}>
                                      <Receipt className="w-[13px] h-[13px]" />
                                    </div>
                                    <p className={`font-serif text-[15px] truncate ${isPaid ? 'line-through text-ink/50' : 'text-coffee'}`}>
                                      {expense.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 ml-9">
                                    {catLabel && (
                                      <span className="inline-flex items-center text-[11.5px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: `${railColor}15`, color: railColor }}>
                                        {catLabel.split(' / ').slice(-1)[0]}
                                      </span>
                                    )}
                                    {expense.attachment_path && (
                                      <span className="flex items-center gap-1 text-[11px] text-ink/40">
                                        <Paperclip className="w-3 h-3" /> anexo
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Method + installments */}
                                <div className="hidden lg:flex items-center gap-1.5 w-[120px] shrink-0 text-ink/60">
                                  {expense.payment_method === 'PIX'
                                    ? <span className="text-[11px] font-bold" style={{ color: '#3E8E5C' }}>PIX</span>
                                    : expense.payment_method
                                      ? <CreditCard className="w-[13px] h-[13px]" />
                                      : null}
                                  <span className="text-[12px]">{methodLabel || '—'}</span>
                                  {installmentBadge && <span className="text-[11px] font-semibold text-petrol ml-1">{installmentBadge}</span>}
                                </div>
                                {/* Date */}
                                <div className="hidden lg:flex items-center gap-1.5 w-[100px] shrink-0 text-ink/55 text-[12.5px]">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(expense.date, 'dd/MM/yy')}
                                </div>
                                {/* Amount + status */}
                                <div className="text-right shrink-0 w-[100px]">
                                  <p className={`font-numbers font-bold text-[15px] tabular-nums ${isOverdue ? 'text-[#B05C3A]' : isPaid ? 'text-[#3E5F4B]/60' : 'text-[#3E5F4B]'}`}>
                                    {formatBRL(expense.amount_cents)}
                                  </p>
                                  <span className="inline-block text-[10.5px] font-bold uppercase tracking-[0.04em] px-2.5 py-[3px] rounded-full mt-1" style={{ background: statusBg, color: statusFg }}>
                                    {statusLabel}
                                  </span>
                                </div>
                                {/* Menu */}
                                <div
                                  className="shrink-0 ml-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ActionMenu
                                    onView={() => openDetails(expense)}
                                    onEdit={() => openModal(expense)}
                                    onDelete={() => handleDelete(expense.id)}
                                    onAttach={(file) => handleAttachExpense(expense, file)}
                                    onToggleStatus={() => handleTogglePaid(expense)}
                                    toggleStatusLabel={isPaid ? 'Marcar como Em aberto' : 'Marcar como Pago'}
                                    disabled={isUpdating}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => setVisibleCount(n => n + 30)}
                      className="px-5 py-2.5 rounded-[10px] border border-border bg-white text-[13px] font-medium text-ink/70 hover:bg-bg transition-vintage"
                    >
                      Mostrar mais ({sortedExpenses.length - visibleCount} restantes)
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile footer - sticky outside scroll */}
      <div className="md:hidden shrink-0 px-[18px] pt-3 pb-2 border-t border-border bg-offWhite">
        <div className="flex flex-row gap-3">
          <div className="flex-1 rounded-[16px] px-4 py-4 bg-petrol text-white text-center shadow-soft">
            <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Em aberto</div>
            <div className="font-numbers text-xl font-medium">{formatBRL(open)}</div>
          </div>
          <div className="flex-1 rounded-[16px] px-4 py-4 bg-olive text-white text-center shadow-soft">
            <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Pago</div>
            <div className="font-numbers text-xl font-medium">{formatBRL(paid)}</div>
          </div>
        </div>
        <div className="h-[44px] flex items-center justify-center">
          <p className="text-center text-[13px] text-gold italic">
            Cada conta paga é um gesto de cuidado com o amanhã da família.
          </p>
        </div>
      </div>

      {/* Desktop footer */}
      <footer className="hidden md:block mt-auto w-full">
        <div className="h-[56px] bg-paper flex items-center justify-center px-6">
          <p className="text-center text-[13px] text-gold italic">
            Cada conta paga é um gesto de cuidado com o amanhã da família.
          </p>
        </div>
      </footer>

      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={closePdfModal}
        title="Preview do PDF"
        summary={buildFilterSummary()}
        pdfUrl={pdfUrl}
        isGenerating={exportingFormat === 'pdf'}
        showSignaturesToggle
        includeSignatures={includeSignatures}
        onToggleSignatures={async (nextValue) => {
          setIncludeSignatures(nextValue)
          await refreshPdfPreview(nextValue)
        }}
        onDownload={downloadPreviewPdf}
        downloadLabel="Imprimir ou salvar"
      />

      {/* Expense form — RightDrawer on desktop, Modal on mobile */}
      <RightDrawer
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
        subtitle="Compromissos honrados constroem segurança."
        accent="#B05C3A"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-ink mb-2">
              Descrição <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value, categoryId: '' })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conta de luz"
            />
            {suggestedCategoryId && !formData.categoryId && categoryLabelMap.get(suggestedCategoryId) && (
              <button
                type="button"
                onClick={() => { setFormData(f => ({ ...f, categoryId: suggestedCategoryId })); setSuggestedCategoryId(null) }}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-petrol border border-petrol/30 rounded-full px-2.5 py-1 hover:bg-petrol/5 transition-vintage"
              >
                <span className="text-ink/40">Sugestão:</span>
                <span className="font-medium">{categoryLabelMap.get(suggestedCategoryId)}</span>
                <Check className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>

          <div>
            <label className="block font-body text-ink mb-2">
              Valor <span className="text-terracotta">*</span>
            </label>
            <CurrencyInput
              required
              value={formData.amount}
              onChange={(v) => setFormData({ ...formData, amount: v })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>

          <div>
            <label className="block font-body text-ink mb-2">
              Data <span className="text-terracotta">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>

          <Select
            label="Categoria"
            value={formData.categoryId}
            onChange={(v) => setFormData({ ...formData, categoryId: v })}
            options={categoryOptions}
            required
            variant="modal"
          />

          {/* Limit indicator */}
          {(() => {
            if (!categoryLimitInfo) return null
            const { limitCents, spentCents, limitCategoryName } = categoryLimitInfo
            const amountCents = formData.amount ? Math.round(parseFloat(formData.amount) * 100) : 0
            const projected = spentCents + amountCents
            const projectedPct = limitCents > 0 ? Math.round((projected / limitCents) * 100) : 0
            if (projectedPct < 80 && projected <= limitCents) return null
            const isOver = projected > limitCents
            const barColor = isOver ? '#B05C3A' : '#C2A45D'
            const excess = projected - limitCents
            return (
              <div className={`rounded-lg px-3 py-2.5 border text-sm ${isOver ? 'bg-terracotta/8 border-terracotta/30 text-terracotta' : 'bg-gold/8 border-gold/30 text-gold'}`}>
                <p className="font-medium">
                  {isOver
                    ? `⚠️ Esta despesa passa o limite de ${limitCategoryName} em ${formatBRL(excess)}.`
                    : `⚠️ Esta despesa deixa ${limitCategoryName} a ${projectedPct}% do limite.`
                  }
                </p>
                <p className="text-ink/60 text-xs mt-0.5">
                  Limite do mês: {formatBRL(limitCents)} · já lançado {formatBRL(spentCents)}.
                </p>
                <div className="w-full h-1.5 rounded-full bg-border/50 overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(projectedPct, 100)}%`, backgroundColor: barColor }} />
                </div>
              </div>
            )
          })()}

          <div>
            <label className="block font-body text-ink mb-2">Método</label>
            <div className="flex gap-2">
              {(['PIX', 'Credito', 'Debito', 'ValeAlimentacao'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: method, installments: method === 'Credito' ? formData.installments : 1 })}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-vintage ${
                    formData.paymentMethod === method
                      ? 'border-sidebar bg-sidebar text-paper'
                      : 'border-border bg-bg text-ink hover:bg-paper'
                  }`}
                >
                  {method === 'Credito' ? 'Crédito' : method === 'Debito' ? 'Débito' : method === 'ValeAlimentacao' ? 'Vale Alimentação' : method}
                </button>
              ))}
            </div>
          </div>

          {formData.paymentMethod === 'Credito' ? (
            <Select
              label="Parcelas"
              value={String(formData.installments)}
              onChange={(value) => setFormData({ ...formData, installments: parseInt(value, 10) || 1 })}
              options={Array.from({ length: 12 }, (_, index) => {
                const count = index + 1
                return { value: String(count), label: `${count}x` }
              })}
              required
              variant="modal"
            />
          ) : null}

          {formData.paymentMethod === 'Credito' && formData.installments > 1 && formData.amount && !isNaN(parseFloat(formData.amount)) && parseFloat(formData.amount) > 0 ? (() => {
            const totalCents = Math.round(parseFloat(formData.amount) * 100)
            const splits = splitAmountCents(totalCents, formData.installments)
            const firstCents = splits[0]
            const lastCents = splits[splits.length - 1]
            const uniform = firstCents === lastCents
            return (
              <div className="rounded-lg bg-paper border border-border px-4 py-3 text-sm space-y-1">
                <p className="font-serif font-medium text-ink">Resumo do parcelamento</p>
                {uniform ? (
                  <p className="text-ink/70">
                    {formData.installments}x de{' '}
                    <span className="font-numbers font-semibold text-petrol">{formatBRL(firstCents)}</span>
                  </p>
                ) : (
                  <p className="text-ink/70">
                    {formData.installments - 1}x de{' '}
                    <span className="font-numbers font-semibold text-petrol">{formatBRL(lastCents)}</span>
                    {' '}+ 1x de{' '}
                    <span className="font-numbers font-semibold text-petrol">{formatBRL(firstCents)}</span>
                    <span className="text-xs text-ink/40 ml-1">(arredondamento)</span>
                  </p>
                )}
              </div>
            )
          })() : null}

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status === 'paid'}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'paid' : 'open' })}
                className="w-5 h-5 rounded border-border"
              />
              <span className="text-sm font-body text-ink">Marcar como pago</span>
            </label>
          </div>

          {!editingExpense && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-5 h-5 rounded border-border"
                />
                <span className="text-sm font-body text-ink">Despesa recorrente</span>
              </label>
              {formData.isRecurring && (
                <Select
                  label="Recorrência"
                  value={formData.recurrenceFrequency}
                  onChange={(v) => setFormData({ ...formData, recurrenceFrequency: v })}
                  options={RECURRENCE_OPTIONS}
                  required
                  variant="modal"
                />
              )}
            </div>
          )}

          {formError && (
            <p className="text-[12.5px] text-[#B05C3A] rounded-lg bg-[#B05C3A]/8 border border-[#B05C3A]/25 px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-sidebar text-paper rounded-lg hover:bg-sidebar/90 transition-vintage"
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
        title="Excluir despesa"
        message="Esta despesa será removida permanentemente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
      />

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalhes da despesa"
      >
        {detailExpense && (() => {
          const { attachmentUrl, cleanNotes } = parseLegacyAttachment(detailExpense.notes)
          const hasAttachment = Boolean(detailExpense.attachment_path || attachmentUrl)
          return (
            <div className="space-y-3 text-sm text-ink/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Descrição</p>
                <p className="text-base text-ink">{detailExpense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Categoria</p>
                  <CategoryPathStack
                    label={getCategoryLabel(detailExpense.category_id, detailExpense.category_name)}
                    icon={detailExpense.category_id ? categoryIconMap.get(detailExpense.category_id) : null}
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Data</p>
                  <p>{formatDate(detailExpense.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Status</p>
                  <p>{detailExpense.status === 'paid' ? 'Pago' : detailExpense.status === 'pending_confirmation' ? 'Aguardando confirmação' : 'Em aberto'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Método</p>
                  <p>{formatPaymentLabel(detailExpense.payment_method, detailExpense.installments)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Observação</p>
                <p>{cleanNotes || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Arquivo</p>
                {hasAttachment ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        window.open(await getAttachmentViewUrl(detailExpense.attachment_path, attachmentUrl), '_blank', 'noopener,noreferrer')
                      } catch {
                        toast('Não foi possível abrir o anexo. Tente novamente.', { type: 'error' })
                      }
                    }}
                    className="text-petrol hover:opacity-80 transition-vintage"
                  >
                    Visualizar anexo
                  </button>
                ) : (
                  <p>Sem arquivo anexado</p>
                )}
              </div>
              {detailExpense.created_by && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Criado por</p>
                  <p>{familyMembers.get(detailExpense.created_by) ?? '-'}</p>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      <CategorySettingsModal
        isOpen={isCategorySettingsOpen}
        onClose={() => setIsCategorySettingsOpen(false)}
        familyId={familyId}
        kind="expense"
        onChanged={() => {
          loadCategories()
          loadExpenses()
        }}
      />
      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={loadExpenses}
      />

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        month={selectedMonth}
        year={selectedYear}
        status={selectedStatus}
        method={selectedPaymentMethod}
        showStatus
        showMethod
        onApply={(m, y, s, met) => {
          setSelectedMonth(m)
          setSelectedYear(y)
          if (s !== undefined) setSelectedStatus(s)
          if (met !== undefined) setSelectedPaymentMethod(met)
        }}
      />

      <Modal isOpen={showPaywallModal} onClose={() => setShowPaywallModal(false)} title="Limite atingido">
        <div className="space-y-4">
          <p className="text-ink/80 text-sm">
            Você atingiu o limite de 3 exportações/importações gratuitas este mês.
          </p>
          <p className="text-ink/60 text-sm">
            Assine o Florim Pro para exportações ilimitadas e outros recursos avançados.
          </p>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowPaywallModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage text-sm">
              Fechar
            </button>
            <a href="/settings/billing" className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg text-sm font-semibold text-center hover:bg-coffee/90 transition-vintage">
              Ver planos
            </a>
          </div>
        </div>
      </Modal>

    </div>
  )
}
