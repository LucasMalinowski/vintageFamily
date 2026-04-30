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
import CategoryPathStack from '@/components/ui/CategoryPathStack'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { formatBRL } from '@/lib/money'
import {
  formatDate,
  formatMonthYear,
  getCurrentMonth,
  getCurrentYear,
  getMonthOptions,
  getMonthLabel,
  getYearLabel,
  getYearOptions,
  getYearRange,
  isDateWithinFilters,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { buildInstallmentDates, splitAmountCents } from '@/lib/installments'
import { Calendar, Check, Edit2, Download, Receipt, SlidersHorizontal, Search, Plus, X, Tag } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import FilterSheet from '@/components/layout/FilterSheet'
import { mergeAttachment, parseAttachment } from '@/lib/attachments'
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
import { buildBrandedPdfBlob, downloadBlob, downloadCsv } from '@/lib/report-export'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'

type PaymentMethod = 'PIX' | 'Credito' | 'Debito'

const buildAttachmentPath = (familyId: string, expenseId: string, fileName: string) => {
  const safeName = fileName.replace(/\s+/g, '-')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${familyId}/${expenseId}/${timestamp}-${safeName}`
}

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
  if (method === 'PIX') return 'PIX'
  return 'Não definido'
}

export default function Expenses() {
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
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [includeSignatures, setIncludeSignatures] = useState(true)
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)

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
      // eslint-disable-next-line react-hooks/immutability
      loadCategories()
    }
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
      .select('id,name,kind,parent_id,is_system,icon')
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

    query = query.order('date', { ascending: false })

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
        payment_method: normalizePaymentMethod(row.payment_method),
        installments: row.installments || 1,
        installment_group_id: row.installment_group_id,
        installment_index: row.installment_index,
      }))
      setExpenses(normalized.filter((expense) => isDateWithinFilters(expense.date, selectedMonth, selectedYear)))
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
    const filePath = buildAttachmentPath(familyId, expense.id, file.name)

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
  const groupedExpenses = sortedExpenses.reduce<Array<{ label: string; items: Expense[] }>>((groups, expense) => {
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
    filename: `contas-a-pagar-${format(new Date(), 'yyyy-MM-dd')}`,
    title: 'Contas a Pagar',
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
      headers: ['Data', 'Descricao', 'Categoria', 'Status', 'Metodo', 'Parcelas', 'Valor', 'Pago em', 'Observacao'],
      rows: expensesOverride.map((expense) => [
        formatDate(expense.date),
        expense.description,
        getCategoryLabel(expense.category_id, expense.category_name),
        expense.status === 'paid' ? 'Pago' : 'Em aberto',
        formatPaymentLabel(expense.payment_method, expense.installments),
        expense.installments && expense.installments > 1 ? `${expense.installments}x` : '',
        formatBRL(expense.amount_cents),
        expense.paid_at ? formatDate(expense.paid_at) : '',
        expense.notes || '',
      ]),
      cards: [
        { label: 'TOTAL', value: formatBRL(totalCents) },
        { label: 'PAGO', value: formatBRL(paidCents) },
        { label: 'EM ABERTO', value: formatBRL(totalCents - paidCents) },
      ],
      generatedDate: formatDate(new Date()),
      includeSignatures: includeSignatureOverride,
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
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `${exportTable.filename}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }

    const blob = await generatePdfBlob()
    downloadBlob(`${exportTable.filename}.pdf`, blob)
  }

  const handleExportCsv = async () => {
    if (!exportRows.length) return
    setExportingFormat('csv')
    try {
      downloadCsv({ ...exportTable, filename: `${exportTable.filename}.csv` })
    } finally {
      setExportingFormat(null)
    }
  }

  const handleExportPdf = async () => {
    if (!exportRows.length) return
    await openPdfPreview()
  }

  return (
    <div className="flex flex-col h-full md:min-h-screen">
      <Topbar
        title="Contas a Pagar"
        subtitle="Compromissos honrados constroem segurança."
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
                className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4 text-ink/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">Importar extrato</p>
                  <p className="text-xs text-ink/45">OFX, CSV de banco</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop filter search bar */}
      <div className="hidden md:block px-6 py-4">
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
                onClick={() => setIsImportModalOpen(true)}
                className="px-5 py-2 bg-bg text-petrol border border-petrol/30 rounded-md hover:bg-paper transition-vintage text-sm"
              >
                Importar extrato bancário
              </button>
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

      {/* Scrollable cards area — mobile only internal scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible">
        <div className={`w-full flex flex-col md:flex-row md:px-6 md:pb-4 ${filtersOpen ? 'md:gap-4' : 'md:gap-0'} md:items-stretch`}>
          <div className="hidden md:contents">
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
                options={getMonthOptions(true)}
              />
              <Select
                variant="filter"
                label="Ano"
                value={selectedYear.toString()}
                onChange={(v) =>
                  setSelectedYear(v ? parseInt(v, 10) : getCurrentYear())
                }
                options={getYearOptions(2020, true)}
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
          </div>

          <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
            {loading ? (
              <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-16 h-16" />}
                message="Ainda não há despesas aqui, um bom começo."
                submessage="Use o botão + para adicionar uma despesa."
              />
            ) : (
              <div className="space-y-5">
                {groupedExpenses.map((group) => (
                  <div key={group.label} className="space-y-3">
                    {groupedExpenses.length > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/70" />
                        <span className="rounded-full border border-border bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink/65 shadow-sm">
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-border/70" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {group.items.map((expense) => {
                        const isUpdating = updatingIds.includes(expense.id)
                        const catLabel = getCategoryLabel(expense.category_id, expense.category_name)
                        const catParts = catLabel ? catLabel.split(' / ') : []
                        const catIcon = expense.category_id ? categoryIconMap.get(expense.category_id) : null
                        const isPaid = expense.status === 'paid'
                        return (
                          <div
                            id={`expense-${expense.id}`}
                            key={expense.id}
                            className={`transition-vintage ${isUpdating ? 'opacity-60' : ''}`}
                          >
                            {/* ── MOBILE card ── */}
                            <div className="md:hidden rounded-xl overflow-hidden border border-border bg-offWhite shadow-sm flex">
                              <div className={`w-[3px] shrink-0 ${isPaid ? 'bg-olive' : 'bg-amber-400'}`} />
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

                            {/* ── DESKTOP card ── */}
                            <div className="hidden md:flex items-start gap-3 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage">
                              <button
                                type="button"
                                onClick={() => handleTogglePaid(expense)}
                                disabled={isUpdating}
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage disabled:opacity-50 ${
                                  isPaid ? 'border-olive bg-olive' : 'border-border bg-transparent hover:border-olive'
                                }`}
                                aria-label={`Marcar ${expense.description} como ${isPaid ? 'em aberto' : 'pago'}`}
                              >
                                {isPaid && <Check className="h-3 w-3 text-white" />}
                              </button>

                              {catIcon && (
                                <CategoryIcon name={catIcon} className="mt-1 w-4 h-4 shrink-0 text-ink/40" />
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <h4 className={`text-base font-medium font-serif leading-tight transition-vintage ${isPaid ? 'text-sidebar/60 line-through decoration-sidebar/30' : 'text-sidebar'}`}>
                                    {expense.description}
                                  </h4>
                                  <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/60">
                                    {formatDate(expense.date)}
                                  </span>
                                  {isPaid && (
                                    <span className="rounded-full bg-olive/15 px-2.5 py-0.5 text-[11px] font-semibold text-olive">
                                      Pago
                                    </span>
                                  )}
                                </div>
                                <CategoryPathStack
                                  label={catLabel}
                                  icon={catIcon}
                                  className="mt-1"
                                />
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`font-numbers text-base font-semibold ${isPaid ? 'text-sidebar/60' : 'text-sidebar'}`}>
                                  {formatBRL(expense.amount_cents)}
                                </span>
                                {expense.payment_method === null && (
                                  <span
                                    title="Método de pagamento não definido. Edite para definir."
                                    className="text-xs text-amber-600 border border-amber-400/40 rounded px-1.5 py-0.5 cursor-help"
                                  >
                                    ⚠ Sem método
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0">
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
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile footer — sticky outside scroll */}
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
        <div className="px-6 mb-4">
          <div className="flex flex-row gap-4 justify-center items-center">
            <div className="flex-1 rounded-[16px] px-6 py-5 bg-petrol text-white text-center shadow-soft">
              <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Em aberto</div>
              <div className="font-numbers text-xl font-medium">{formatBRL(open)}</div>
            </div>
            <div className="flex-1 rounded-[16px] px-6 py-5 bg-olive text-white text-center shadow-soft">
              <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Pago</div>
              <div className="font-numbers text-xl font-medium">{formatBRL(paid)}</div>
            </div>
          </div>
          <div className="flex flex-row justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!sortedExpenses.length || exportingFormat !== null}
              className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
            >
              {exportingFormat === 'csv' ? 'Gerando CSV...' : 'Gerar CSV'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!sortedExpenses.length || exportingFormat !== null}
              className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
            >
              {exportingFormat === 'pdf' ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>
          </div>
        </div>
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
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
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Conta de luz"
            />
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

          <div>
            <label className="block font-body text-ink mb-2">Método</label>
            <div className="flex gap-2">
              {(['PIX', 'Credito', 'Debito'] as PaymentMethod[]).map((method) => (
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
                  {method === 'Credito' ? 'Crédito' : method === 'Debito' ? 'Débito' : method}
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
    </div>
  )
}
