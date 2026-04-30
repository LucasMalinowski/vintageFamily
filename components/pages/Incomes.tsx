'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  getMonthLabel,
  getMonthOptions,
  getYearLabel,
  getYearOptions,
  getYearRange,
  isDateWithinFilters,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { ArrowDown, Calendar, Check, DollarSign, Download, Edit2, SlidersHorizontal, Search, Plus, X, Tag } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import FilterSheet from '@/components/layout/FilterSheet'
import { mergeAttachment, parseAttachment } from '@/lib/attachments'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import BankStatementImportModal from '@/components/bank-statements/BankStatementImportModal'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
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

type IncomeStatus = 'received' | 'pending'

interface Income {
  id: string
  description: string
  category_id: string | null
  category_name: string
  amount_cents: number
  date: string
  status: IncomeStatus
  notes: string | null
}

const buildAttachmentPath = (familyId: string, incomeId: string, fileName: string) => {
  const safeName = fileName.replace(/\s+/g, '-')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${familyId}/${incomeId}/${timestamp}-${safeName}`
}

export default function Incomes() {
  const { familyId } = useAuth()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'' | IncomeStatus>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [detailIncome, setDetailIncome] = useState<Income | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'received' as IncomeStatus,
    notes: '',
  })

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system,icon')
      .eq('family_id', familyId!)
      .eq('kind', 'income')
      .order('name')

    setCategories((data || []) as CategoryRecord[])
  }, [familyId])

  const loadIncomes = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('incomes')
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

    const { data } = await query

    if (data) {
      setIncomes(
        data
          .map((row) => ({
            ...row,
            status: (row.status === 'pending' ? 'pending' : 'received') as IncomeStatus,
          }))
          .filter((income) => isDateWithinFilters(income.date, selectedMonth, selectedYear))
      )
    }
    setLoading(false)
  }, [familyId, selectedMonth, selectedYear, selectedCategoryId, selectedStatus])

  useEffect(() => {
    if (familyId) {
      loadCategories()
    }
  }, [familyId, loadCategories])

  useEffect(() => {
    if (familyId) {
      loadIncomes()
    }
  }, [familyId, loadIncomes])

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

  const getIncomeStatusLabel = (status: IncomeStatus) => (status === 'received' ? 'Recebido' : 'A receber')

  const handleToggleReceived = async (income: Income) => {
    if (updatingIds.includes(income.id)) return
    const nextStatus: IncomeStatus = income.status === 'received' ? 'pending' : 'received'
    setUpdatingIds((prev) => [...prev, income.id])
    await supabase
      .from('incomes')
      .update({ status: nextStatus })
      .eq('id', income.id)
    setUpdatingIds((prev) => prev.filter((id) => id !== income.id))
    loadIncomes()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const category = categoryById.get(formData.categoryId)
    const categoryLabel = category ? (categoryLabelMap.get(category.id) || category.name) : null
    const todayISO = format(new Date(), 'yyyy-MM-dd')
    const status: IncomeStatus = formData.date > todayISO && formData.status === 'received'
      ? 'pending'
      : formData.status

    if (!category || !categoryLabel) {
      alert('Selecione uma categoria válida.')
      return
    }

    const incomeData = {
      family_id: familyId!,
      description: formData.description,
      category_id: category.id,
      category_name: categoryLabel,
      amount_cents: amountCents,
      date: formData.date,
      status,
      notes: mergeAttachment(formData.notes || null, currentAttachmentUrl),
    }

    if (editingIncome) {
      await supabase
        .from('incomes')
        .update({ ...incomeData, updated_at: new Date().toISOString() })
        .eq('id', editingIncome.id)
    } else {
      await supabase.from('incomes').insert(incomeData)
    }

    closeModal()
    loadIncomes()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remover este registro?')) {
      await supabase.from('incomes').delete().eq('id', id)
      loadIncomes()
    }
  }

  const openDetails = (income: Income) => {
    setDetailIncome(income)
    setIsDetailOpen(true)
  }

  const handleAttachIncome = async (income: Income, file: File) => {
    if (!familyId) return
    const filePath = buildAttachmentPath(familyId, income.id, file.name)

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert('Erro ao enviar arquivo.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
    const { cleanNotes } = parseAttachment(income.notes)
    const mergedNotes = mergeAttachment(cleanNotes || null, publicUrlData.publicUrl)

    await supabase
      .from('incomes')
      .update({ notes: mergedNotes, updated_at: new Date().toISOString() })
      .eq('id', income.id)

    loadIncomes()
  }

  const openModal = (income?: Income) => {
    if (income) {
      const { attachmentUrl, cleanNotes } = parseAttachment(income.notes)
      setEditingIncome(income)
      setCurrentAttachmentUrl(attachmentUrl)
      setFormData({
        description: income.description,
        categoryId: income.category_id || findCategoryIdByStoredName(categories, income.category_name) || '',
        amount: (income.amount_cents / 100).toFixed(2),
        date: income.date,
        status: income.status,
        notes: cleanNotes || '',
      })
    } else {
      setEditingIncome(null)
      setCurrentAttachmentUrl(null)
      setFormData({
        description: '',
        categoryId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'received',
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
    setCurrentAttachmentUrl(null)
  }

  const filteredIncomes = incomes.filter((income) =>
    matchesSearch(
      searchTerm,
      income.description,
      getCategoryLabel(income.category_id, income.category_name)
    )
  )
  const groupedIncomes = filteredIncomes
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .reduce<Array<{ label: string; items: Income[] }>>((groups, income) => {
      const label = formatMonthYear(income.date)
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(income)
        return groups
      }
      groups.push({ label, items: [income] })
      return groups
    }, [])
  const total = filteredIncomes.reduce((sum, inc) => sum + inc.amount_cents, 0)
  const activeFiltersCount = [
    selectedMonth !== getCurrentMonth(),
    selectedYear !== getCurrentYear(),
    selectedCategoryId !== '',
    selectedStatus !== '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    setSelectedCategoryId('')
    setSelectedStatus('')
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
          label: getIncomeStatusLabel(selectedStatus as IncomeStatus),
          onRemove: () => setSelectedStatus(''),
        }]
      : []),
  ]

  const exportRows = groupedIncomes.flatMap((group) =>
    group.items.map((income) => [
      formatDate(income.date),
      income.description,
      getCategoryLabel(income.category_id, income.category_name),
      getIncomeStatusLabel(income.status),
      formatBRL(income.amount_cents),
      income.notes || '',
    ]),
  )

  const exportSubtitle = [
    `Período: ${selectedMonth === ALL_MONTHS_VALUE ? 'todos os meses' : getMonthLabel(selectedMonth)} / ${selectedYear === ALL_YEARS_VALUE ? 'todos os anos' : getYearLabel(selectedYear)}`,
    selectedCategoryId ? `Categoria: ${getCategoryLabel(selectedCategoryId, 'Categoria')}` : null,
    selectedStatus ? `Status: ${getIncomeStatusLabel(selectedStatus as IncomeStatus)}` : null,
    searchTerm ? `Busca: ${searchTerm}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `contas-a-receber-${format(new Date(), 'yyyy-MM-dd')}`,
    title: 'Contas a Receber',
    subtitle: exportSubtitle,
    headers: ['Data', 'Descrição', 'Categoria', 'Status', 'Valor', 'Observações'],
    rows: exportRows,
  }

  const buildIncomePdfBlob = () => {
    const receivedCents = filteredIncomes
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    return buildBrandedPdfBlob({
      title: 'Contas a Receber',
      filterSummary: exportSubtitle || 'Sem filtros ativos',
      headers: ['Data', 'Descricao', 'Categoria', 'Status', 'Valor', 'Observacao'],
      rows: exportRows,
      cards: [
        { label: 'TOTAL', value: formatBRL(total) },
        { label: 'RECEBIDO', value: formatBRL(receivedCents) },
        { label: 'A RECEBER', value: formatBRL(total - receivedCents) },
      ],
      generatedDate: formatDate(new Date()),
    })
  }

  const closePdfModal = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl('')
    setPdfBlob(null)
    setPdfError(null)
    setIsPdfModalOpen(false)
  }

  const openPdfPreview = async () => {
    setExportingFormat('pdf')
    setPdfGenerating(true)
    setPdfUrl('')
    setPdfBlob(null)
    setPdfError(null)
    setIsPdfModalOpen(true)

    try {
      const blob = await buildIncomePdfBlob()
      const url = URL.createObjectURL(blob)
      setPdfBlob(blob)
      setPdfUrl(url)
    } catch {
      setPdfError('Não foi possível gerar o preview do PDF nesta tela.')
    } finally {
      setPdfGenerating(false)
      setExportingFormat(null)
    }
  }

  const downloadPreviewPdf = async () => {
    try {
      if (pdfBlob) {
        downloadBlob(`${exportTable.filename}.pdf`, pdfBlob)
        return
      }

      const blob = await buildIncomePdfBlob()
      downloadBlob(`${exportTable.filename}.pdf`, blob)
    } catch {
      setPdfError('Não foi possível baixar o PDF desta tela.')
    }
  }

  const totalLabel = selectedStatus === 'pending'
    ? 'Total A Receber'
    : selectedStatus === 'received'
      ? 'Total Recebido'
      : 'Total no período'

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
    <>
      <div className="flex flex-col h-full md:min-h-screen">
        <Topbar
          title="Contas a Receber"
          subtitle="O fruto do trabalho em forma de números."
          variant="textured"
        />

        {/* Mobile filter bar */}
        <div className="md:hidden relative border-b border-border bg-offWhite px-[18px] py-[10px] flex gap-[9px] items-center shrink-0">
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex items-center gap-1.5 h-[38px] px-3 rounded-[10px] border border-border bg-bg text-ink text-sm font-medium shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-petrol" />
            <span className="leading-tight text-left">
              {selectedMonth === ALL_MONTHS_VALUE
                ? (selectedYear === ALL_YEARS_VALUE ? 'Todos' : 'Todos os meses')
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
                  Nova Receita
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
                onChange={(v) => setSelectedMonth(parseInt(v))}
                options={getMonthOptions(true)}
              />
              <Select
                variant="filter"
                label="Ano"
                value={selectedYear.toString()}
                onChange={(v) => setSelectedYear(parseInt(v))}
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
                onChange={(v) => setSelectedStatus((v as IncomeStatus) || '')}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'received', label: 'Recebido' },
                  { value: 'pending', label: 'A receber' },
                ]}
              />
              </FilterSidebar>
            </div>

            <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
              {loading ? (
                <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : filteredIncomes.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-16 h-16" />}
                message="Ainda não há receitas registradas."
                submessage="Use o botão + para adicionar uma receita."
              />
            ) : (
              <div className="space-y-5">
                {groupedIncomes.map((group) => (
                  <div key={group.label} className="space-y-3">
                    {groupedIncomes.length > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/70" />
                        <span className="rounded-full border border-border bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink/65 shadow-sm">
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-border/70" />
                      </div>
                    )}
                    <div className="space-y-3">
                      {group.items.map((income) => {
                        const isUpdating = updatingIds.includes(income.id)
                        const catLabel = getCategoryLabel(income.category_id, income.category_name)
                        const catParts = catLabel ? catLabel.split(' / ') : []
                        const catIcon = income.category_id ? categoryIconMap.get(income.category_id) : null
                        const isReceived = income.status === 'received'
                        return (
                          <div
                            key={income.id}
                            className={`transition-vintage ${isUpdating ? 'opacity-60' : ''}`}
                          >
                            {/* ── MOBILE card ── */}
                            <div className="md:hidden rounded-xl overflow-hidden border border-border bg-offWhite shadow-sm flex">
                              <div className={`w-[3px] shrink-0 ${isReceived ? 'bg-olive' : 'bg-amber-400'}`} />
                              <div className="flex-1 p-3 min-w-0 space-y-2">
                                {/* Row 1: checkbox + icon + title + menu */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleReceived(income)}
                                    disabled={isUpdating}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage disabled:opacity-50 ${
                                      isReceived ? 'border-olive bg-olive' : 'border-amber-400 bg-transparent'
                                    }`}
                                    aria-label={`Marcar ${income.description} como ${isReceived ? 'a receber' : 'recebido'}`}
                                  >
                                    {isReceived && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                  {catIcon && <CategoryIcon name={catIcon} className="w-4 h-4 shrink-0 text-ink/40" />}
                                  <h4 className={`flex-1 min-w-0 text-base font-medium font-serif truncate ${isReceived ? 'line-through text-sidebar/50 decoration-sidebar/30' : 'text-sidebar'}`}>
                                    {income.description}
                                  </h4>
                                  <ActionMenu
                                    onView={() => openDetails(income)}
                                    onEdit={() => openModal(income)}
                                    onDelete={() => handleDelete(income.id)}
                                    onAttach={(file) => handleAttachIncome(income, file)}
                                    onToggleStatus={() => handleToggleReceived(income)}
                                    toggleStatusLabel={isReceived ? 'Marcar como A receber' : 'Marcar como Recebido'}
                                    disabled={isUpdating}
                                  />
                                </div>

                                {/* Row 2: status badge + date */}
                                <div className="flex items-center justify-between">
                                  {isReceived ? (
                                    <span className="rounded-full bg-olive/15 px-2.5 py-0.5 text-[11px] font-semibold text-olive">Recebido</span>
                                  ) : (
                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">A receber</span>
                                  )}
                                  <div className="flex items-center gap-1 text-ink/50 text-[11px]">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(income.date)}</span>
                                  </div>
                                </div>

                                <div className="h-px bg-border/50" />

                                {/* Row 3: VALOR + amount */}
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-ink/40 font-medium">Valor</p>
                                  <p className={`font-numbers text-xl font-semibold ${isReceived ? 'text-olive' : 'text-sidebar'}`}>
                                    {formatBRL(income.amount_cents)}
                                  </p>
                                </div>

                                {/* Row 4: category */}
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
                              </div>
                            </div>

                            {/* ── DESKTOP card ── */}
                            <div className="hidden md:flex items-start gap-3 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage">
                              <button
                                type="button"
                                onClick={() => handleToggleReceived(income)}
                                disabled={isUpdating}
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage disabled:opacity-50 ${
                                  isReceived ? 'border-olive bg-olive' : 'border-amber-400 bg-transparent hover:border-olive'
                                }`}
                                aria-label={`Marcar ${income.description} como ${isReceived ? 'a receber' : 'recebido'}`}
                              >
                                {isReceived && <Check className="h-3 w-3 text-white" />}
                              </button>

                              {catIcon && (
                                <CategoryIcon name={catIcon} className="mt-1 w-4 h-4 shrink-0 text-ink/40" />
                              )}

                              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <h4 className={`text-xl font-medium font-serif leading-tight transition-vintage ${isReceived ? 'text-sidebar/60' : 'text-sidebar'}`}>
                                      {income.description}
                                    </h4>
                                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/60">
                                      {formatDate(income.date)}
                                    </span>
                                    {isReceived && (
                                      <span className="rounded-full bg-olive/15 px-2.5 py-0.5 text-[11px] font-semibold text-olive">
                                        Recebido
                                      </span>
                                    )}
                                  </div>
                                  <CategoryPathStack
                                    label={catLabel}
                                    icon={catIcon}
                                    className="mt-1"
                                  />
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                  <span className={`font-numbers text-lg font-semibold ${isReceived ? 'text-sidebar/60' : 'text-sidebar'}`}>
                                    {formatBRL(income.amount_cents)}
                                  </span>
                                  <ActionMenu
                                    onView={() => openDetails(income)}
                                    onEdit={() => openModal(income)}
                                    onDelete={() => handleDelete(income.id)}
                                    onAttach={(file) => handleAttachIncome(income, file)}
                                    onToggleStatus={() => handleToggleReceived(income)}
                                    toggleStatusLabel={isReceived ? 'Marcar como A receber' : 'Marcar como Recebido'}
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
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Mobile footer — sticky outside scroll */}
        <div className="md:hidden shrink-0 px-[18px] pt-3 pb-2 border-t border-border bg-offWhite">
          <div className="rounded-[16px] px-6 py-4 bg-petrol text-white shadow-soft flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/80 mb-1">{totalLabel}</div>
              <div className="font-numbers text-xl font-semibold">{formatBRL(total)}</div>
            </div>
            <ArrowDown className="w-6 h-6 text-white/60" />
          </div>
          <div className="h-[44px] flex items-center justify-center">
            <p className="text-center text-[13px] text-gold italic">
              O fruto do trabalho honrado alimenta os sonhos da família.
            </p>
          </div>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="px-6 mb-4">
            <div className="rounded-[16px] px-6 py-5 bg-petrol text-white shadow-soft flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-white/80 mb-1">{totalLabel}</div>
                <div className="font-numbers text-xl font-semibold">{formatBRL(total)}</div>
              </div>
              <ArrowDown className="w-6 h-6 text-white/60" />
            </div>
            <div className="flex flex-row justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!filteredIncomes.length || exportingFormat !== null}
                className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
              >
                {exportingFormat === 'csv' ? 'Gerando CSV...' : 'Gerar CSV'}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!filteredIncomes.length || exportingFormat !== null}
                className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm"
              >
                {exportingFormat === 'pdf' ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              O fruto do trabalho honrado alimenta os sonhos da família.
            </p>
          </div>
        </footer>
      </div>

      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={closePdfModal}
        title="Preview do PDF"
        summary={exportSubtitle}
        pdfUrl={pdfUrl}
        isGenerating={pdfGenerating}
        error={pdfError}
        onDownload={downloadPreviewPdf}
        downloadLabel="Imprimir ou salvar"
        previewLabel="Preview do PDF"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingIncome ? 'Editar Receita' : 'Nova Receita'}
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
              placeholder="Ex: Salário"
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
            <label className="block font-serif font-body text-ink mb-2">
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

          <Select
            label="Status"
            value={formData.status}
            onChange={(v) => setFormData({ ...formData, status: (v as IncomeStatus) || 'received' })}
            options={[
              { value: 'received', label: 'Recebido' },
              { value: 'pending', label: 'A receber' },
            ]}
            variant="modal"
            required
          />

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
        title="Detalhes da receita"
      >
        {detailIncome && (() => {
          const { attachmentUrl, cleanNotes } = parseAttachment(detailIncome.notes)
          return (
            <div className="space-y-3 text-sm text-ink/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Descrição</p>
                <p className="text-base text-ink">{detailIncome.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Categoria</p>
                  <CategoryPathStack
                    label={getCategoryLabel(detailIncome.category_id, detailIncome.category_name)}
                    icon={detailIncome.category_id ? categoryIconMap.get(detailIncome.category_id) : null}
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Data</p>
                  <p>{formatDate(detailIncome.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Status</p>
                  <p>{getIncomeStatusLabel(detailIncome.status)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Valor</p>
                  <p className="font-numbers">{formatBRL(detailIncome.amount_cents)}</p>
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
        kind="income"
        onChanged={() => {
          loadCategories()
          loadIncomes()
        }}
      />
      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={loadIncomes}
      />

      <FilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        month={selectedMonth}
        year={selectedYear}
        status={selectedStatus || undefined}
        showStatus
        statusOptions={[
          { value: '', label: 'Todos' },
          { value: 'received', label: 'Recebido' },
          { value: 'pending', label: 'A receber' },
        ]}
        onApply={(m, y, status) => {
          setSelectedMonth(m)
          setSelectedYear(y)
          setSelectedStatus((status as IncomeStatus) || '')
        }}
      />
    </>
  )
}
