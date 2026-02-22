'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, MONTHS, getYearOptions, getMonthRange } from '@/lib/dates'
import { buildInstallmentDates, splitAmountCents } from '@/lib/installments'
import { Receipt } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import { mergeAttachment, parseAttachment } from '@/lib/attachments'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import {
  buildCategoryLabelMap,
  buildCategoryOptions,
  CategoryRecord,
  findCategoryIdByStoredName,
} from '@/lib/categories'
import { matchesSearch } from '@/lib/filterSearch'

type PaymentMethod = 'PIX' | 'Credito' | 'Debito'

const normalizePaymentMethod = (method: string | null): PaymentMethod | null => {
  if (method === 'PIX' || method === 'Credito' || method === 'Debito') {
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
  status: 'open' | 'paid'
  paid_at: string | null
  notes: string | null
  payment_method: PaymentMethod | null
  installments: number | null
  installment_group_id: string | null
  installment_index: number | null
}

const formatPaymentLabel = (method: PaymentMethod | null, installments: number | null) => {
  if (method === 'Credito') {
    const count = installments && installments > 1 ? `${installments}x` : ''
    return count ? `Credito ${count}` : 'Credito'
  }
  if (method === 'Debito') return 'Debito'
  return 'PIX'
}

export default function Payables() {
  const { familyId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [onlyInstallments, setOnlyInstallments] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)

  // Form
  const [formData, setFormData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'open' as 'open' | 'paid',
    notes: '',
    paymentMethod: 'PIX' as PaymentMethod,
    installments: 1,
  })

  useEffect(() => {
    if (familyId) {
      loadCategories()
    }
  }, [familyId])

  useEffect(() => {
    if (familyId) {
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
  ])

  const categoryById = useMemo(
    () => new Map<string, CategoryRecord>(categories.map((category) => [category.id, category])),
    [categories]
  )
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories])
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

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system')
      .eq('family_id', familyId!)
      .eq('kind', 'expense')
      .order('name')

    setCategories((data || []) as CategoryRecord[])
  }

  const loadExpenses = async () => {
    setLoading(true)
    const resolvedMonth = Number.isFinite(selectedMonth) ? selectedMonth : getCurrentMonth()
    const resolvedYear = Number.isFinite(selectedYear) ? selectedYear : getCurrentYear()
    const { start, end } = getMonthRange(resolvedMonth, resolvedYear)

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

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
        status: row.status === 'paid' ? 'paid' : 'open',
        paid_at: row.paid_at,
        notes: row.notes,
        payment_method: normalizePaymentMethod(row.payment_method) ?? 'PIX',
        installments: row.installments || 1,
        installment_group_id: row.installment_group_id,
        installment_index: row.installment_index,
      }))
      setExpenses(normalized)
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
      alert('Selecione uma categoria válida.')
      return
    }

    const expenseData = {
      family_id: familyId!,
      description: formData.description,
      category_id: category.id,
      category_name: categoryLabel,
      amount_cents: amountCents,
      date: formData.date,
      status: formData.status,
      paid_at: formData.status === 'paid' ? new Date().toISOString() : null,
      notes: mergeAttachment(formData.notes || null, currentAttachmentUrl),
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
        }))
        await supabase.from('expenses').insert(rows)
      } else {
        if (paymentMethod === 'Credito') {
          expenseData.installment_group_id = crypto.randomUUID()
          expenseData.installment_index = 1
        }
        await supabase.from('expenses').insert(expenseData)
      }
    }

    closeModal()
    loadExpenses()
  }

  const handleDelete = async (id: string) => {
    if (updatingIds.includes(id)) return
    if (confirm('Remover este registro?')) {
      setUpdatingIds((prev) => [...prev, id])
      await supabase.from('expenses').delete().eq('id', id)
      setUpdatingIds((prev) => prev.filter((item) => item !== id))
      loadExpenses()
    }
  }

  const handleTogglePaid = async (expense: Expense) => {
    if (updatingIds.includes(expense.id)) return
    const nextStatus = expense.status === 'paid' ? 'open' : 'paid'
    const now = new Date().toISOString()
    const nextPaidAt = nextStatus === 'paid' ? now : null

    setUpdatingIds((prev) => [...prev, expense.id])
    await supabase
      .from('expenses')
      .update({ status: nextStatus, paid_at: nextPaidAt, updated_at: now })
      .eq('id', expense.id)
    setUpdatingIds((prev) => prev.filter((item) => item !== expense.id))

    loadExpenses()
  }

  const openDetails = (expense: Expense) => {
    setDetailExpense(expense)
    setIsDetailOpen(true)
  }

  const handleAttachExpense = async (expense: Expense, file: File) => {
    if (!familyId) return
    const safeName = file.name.replace(/\s+/g, '-')
    const filePath = `${familyId}/${expense.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert('Erro ao enviar arquivo.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
    const { cleanNotes } = parseAttachment(expense.notes)
    const mergedNotes = mergeAttachment(cleanNotes || null, publicUrlData.publicUrl)

    await supabase
      .from('expenses')
      .update({ notes: mergedNotes, updated_at: new Date().toISOString() })
      .eq('id', expense.id)

    loadExpenses()
  }

  const openModal = (expense?: Expense) => {
    if (expense) {
      const { attachmentUrl, cleanNotes } = parseAttachment(expense.notes)
      setEditingExpense(expense)
      setCurrentAttachmentUrl(attachmentUrl)
      setFormData({
        description: expense.description,
        categoryId: expense.category_id || findCategoryIdByStoredName(categories, expense.category_name) || '',
        amount: (expense.amount_cents / 100).toFixed(2),
        date: expense.date,
        status: expense.status,
        notes: cleanNotes || '',
        paymentMethod: expense.payment_method || 'PIX',
        installments: expense.installments || 1,
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
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
    setCurrentAttachmentUrl(null)
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
  const sortedExpenses = filteredExpenses.slice().sort((a, b) => b.date.localeCompare(a.date))
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
  }
  const activeFilterChips = [
    {
      key: 'month',
      label: MONTHS.find((month) => month.value === selectedMonth)?.label ?? String(selectedMonth),
      onRemove: () => setSelectedMonth(getCurrentMonth()),
      disabled: selectedMonth === getCurrentMonth(),
    },
    {
      key: 'year',
      label: String(selectedYear),
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

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar
        title="Contas a Pagar"
        subtitle="Compromissos honrados constroem segurança."
        variant="textured"
      />

      <div className="flex-1 flex flex-col">
        <div className="px-6 py-4">
          <FilterSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onToggleFilters={() => setFiltersOpen((prev) => !prev)}
            filtersOpen={filtersOpen}
            placeholder="Buscar por nome ou categoria"
            filterChips={activeFilterChips}
            rightSlot={
              <>
                <button
                  onClick={() => setIsCategorySettingsOpen(true)}
                  className="px-5 py-2 bg-bg text-petrol border border-petrol/30 rounded-md hover:bg-paper transition-vintage text-sm"
                >
                  Categorias
                </button>
                <button
                  onClick={() => openModal()}
                  className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm"
                >
                  Nova Despesa
                </button>
              </>
            }
          />
        </div>

        <div className={`px-6 pb-4 w-full flex ${filtersOpen ? 'gap-4' : 'gap-0'} flex-1 items-stretch`}>
          <FilterSidebar
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            showToggle={false}
            collapsedWidthClass="w-0"
            activeFiltersCount={activeFiltersCount}
            onClearFilters={clearFilters}
          >
            <Select
              variant="filter"
              label="Mês"
              value={selectedMonth.toString()}
              onChange={(v) =>
                setSelectedMonth(v ? parseInt(v, 10) : getCurrentMonth())
              }
              options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
            />
            <Select
              variant="filter"
              label="Ano"
              value={selectedYear.toString()}
              onChange={(v) =>
                setSelectedYear(v ? parseInt(v, 10) : getCurrentYear())
              }
              options={getYearOptions()}
            />
            <Select
              variant="filter"
              label="Categoria"
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              options={[
                { value: '', label: 'Todas' },
                ...categoryOptions,
              ]}
            />
            <Select
              variant="filter"
              label="Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: '', label: 'Todos' },
                { value: 'paid', label: 'Pago' },
                { value: 'open', label: 'Em aberto' },
              ]}
            />
            <Select
              variant="filter"
              label="Metodo"
              value={selectedPaymentMethod}
              onChange={setSelectedPaymentMethod}
              options={[
                { value: '', label: 'Todos' },
                { value: 'PIX', label: 'PIX' },
                { value: 'Credito', label: 'Credito' },
                { value: 'Debito', label: 'Debito' },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-petrol pt-2">
              <input
                type="checkbox"
                checked={onlyInstallments}
                onChange={(event) => setOnlyInstallments(event.target.checked)}
                className="w-4 h-4 rounded border-gold/60 accent-gold"
              />
              Somente parceladas
            </label>
          </FilterSidebar>

          <div className="flex-1 min-w-0 flex flex-col">

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-16 h-16" />}
              message="Ainda não há despesas aqui — um bom começo."
              submessage="Use o botão + para adicionar uma despesa."
            />
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => {
                const isUpdating = updatingIds.includes(expense.id)
                return (
                  <div
                    id={`expense-${expense.id}`}
                    key={expense.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage ${
                      isUpdating ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-medium text-sidebar font-serif">
                        {expense.description}
                      </h4>
                      <p className="text-sm text-ink/50">
                        {getCategoryLabel(expense.category_id, expense.category_name)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(expense)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 text-xs uppercase tracking-wide text-ink/60 disabled:opacity-60"
                        aria-label={`Marcar ${expense.description} como ${expense.status === 'paid' ? 'em aberto' : 'pago'}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-sm border ${
                            expense.status === 'paid' ? 'bg-olive border-gold' : 'bg-terracotta border-ink/40'
                          }`}
                        />
                        {expense.status === 'paid' ? 'Pago' : 'Em aberto'}
                      </button>
                      <span
                        className={`font-numbers text-lg font-semibold ${
                          expense.status === 'paid' ? 'text-sidebar/80' : 'text-terracotta'
                        }`}
                      >
                        {formatBRL(expense.amount_cents)}
                      </span>
                      <ActionMenu
                        onView={() => openDetails(expense)}
                        onEdit={() => openModal(expense)}
                        onDelete={() => handleDelete(expense.id)}
                        onAttach={(file) => handleAttachExpense(expense, file)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          </div>
        </div>

        <footer className="mt-auto w-full">
          <div className="px-6 mb-4">

            <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="rounded-[16px] px-10 py-5 bg-petrol text-white text-center shadow-soft min-w-[200px]">
                  <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Em aberto</div>
                  <div className="font-numbers text-xl font-medium">{formatBRL(open)}</div>
                </div>
                <div className="rounded-[16px] px-10 py-5 bg-olive text-white text-center shadow-soft min-w-[200px]">
                  <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Pago</div>
                  <div className="font-numbers text-xl font-medium">{formatBRL(paid)}</div>
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-sm uppercase tracking-wide text-ink/50">Total</div>
                <div className="font-numbers text-xl font-medium text-petrol">{formatBRL(total)}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
              >
                Gerar CSV
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
              >
                Gerar PDF
              </button>
            </div>
          </div>
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              Cada conta paga é um gesto de cuidado com o amanhã da família.
            </p>
          </div>
        </footer>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-ink mb-2 font-serif">
              Descrição <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conta de luz"
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

          <Select
            label="Método de pagamento"
            value={formData.paymentMethod}
            onChange={(value) =>
              setFormData({
                ...formData,
                paymentMethod: value as PaymentMethod,
                installments: value === 'Credito' ? formData.installments : 1,
              })
            }
            options={[
              { value: 'PIX', label: 'PIX' },
              { value: 'Credito', label: 'Credito' },
              { value: 'Debito', label: 'Debito' },
            ]}
            required
            variant="modal"
          />

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

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Valor (R$) <span className="text-terracotta">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block font-serif font-body text-ink mb-2">
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

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Observação
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
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

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalhes da despesa"
      >
        {detailExpense && (() => {
          const { attachmentUrl, cleanNotes } = parseAttachment(detailExpense.notes)
          return (
            <div className="space-y-3 text-sm text-ink/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Descrição</p>
                <p className="text-base text-ink">{detailExpense.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Categoria</p>
                  <p>{getCategoryLabel(detailExpense.category_id, detailExpense.category_name)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Data</p>
                  <p>{formatDate(detailExpense.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Status</p>
                  <p>{detailExpense.status === 'paid' ? 'Pago' : 'Em aberto'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Método</p>
                  <p>{formatPaymentLabel(detailExpense.payment_method, detailExpense.installments)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Observação</p>
                <p>{cleanNotes || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Arquivo</p>
                {attachmentUrl ? (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-petrol hover:opacity-80 transition-vintage"
                  >
                    Visualizar anexo
                  </a>
                ) : (
                  <p>Sem arquivo anexado</p>
                )}
              </div>
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
    </div>
  )
}
