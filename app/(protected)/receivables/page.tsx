'use client'

import AppLayout from '@/components/layout/AppLayout'
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
import { ArrowDown, DollarSign, Download, Edit2, SlidersHorizontal, Search, Plus } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import FilterSheet from '@/components/layout/FilterSheet'
import { mergeAttachment, parseAttachment } from '@/lib/attachments'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import BankStatementImportModal from '@/components/bank-statements/BankStatementImportModal'
import {
  buildCategoryLabelMap,
  buildCategoryOptions,
  CategoryRecord,
  findCategoryIdByStoredName,
} from '@/lib/categories'
import { matchesSearch } from '@/lib/filterSearch'

interface Income {
  id: string
  description: string
  category_id: string | null
  category_name: string
  amount_cents: number
  date: string
  notes: string | null
}

const buildAttachmentPath = (familyId: string, incomeId: string, fileName: string) => {
  const safeName = fileName.replace(/\s+/g, '-')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${familyId}/${incomeId}/${timestamp}-${safeName}`
}

export default function ReceivablesPage() {
  const { familyId } = useAuth()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [detailIncome, setDetailIncome] = useState<Income | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
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
      loadIncomes()
    }
  }, [familyId, selectedMonth, selectedYear, selectedCategoryId])

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

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id,name,kind,parent_id,is_system')
      .eq('family_id', familyId!)
      .eq('kind', 'income')
      .order('name')

    setCategories((data || []) as CategoryRecord[])
  }

  async function loadIncomes() {
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

    const { data } = await query

    if (data) {
      setIncomes(data.filter((income) => isDateWithinFilters(income.date, selectedMonth, selectedYear)))
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const category = categoryById.get(formData.categoryId)
    const categoryLabel = category ? (categoryLabelMap.get(category.id) || category.name) : null

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
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    setSelectedCategoryId('')
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
  ]

  return (
    <AppLayout>
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
          <div className="flex-1 flex items-center relative">
            <Search className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-petrol" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="h-[38px] w-full rounded-[10px] border border-border bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-paper-2/30"
            />
          </div>
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
                      {group.items.map((income) => (
                        <div
                          key={income.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h4 className="text-xl font-medium text-sidebar font-serif leading-tight">
                                {income.description}
                              </h4>
                              <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/60">
                                {formatDate(income.date)}
                              </span>
                            </div>
                            <CategoryPathStack
                              label={getCategoryLabel(income.category_id, income.category_name)}
                              className="mt-1"
                            />
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                            <span className="font-numbers text-lg font-semibold text-sidebar">
                              {formatBRL(income.amount_cents)}
                            </span>
                            <ActionMenu
                              onView={() => openDetails(income)}
                              onEdit={() => openModal(income)}
                              onDelete={() => handleDelete(income.id)}
                              onAttach={(file) => handleAttachIncome(income, file)}
                            />
                          </div>
                        </div>
                      ))}
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
              <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Total Recebido</div>
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
                <div className="text-xs uppercase tracking-wide text-white/80 mb-1">Total Recebido</div>
                <div className="font-numbers text-xl font-semibold">{formatBRL(total)}</div>
              </div>
              <ArrowDown className="w-6 h-6 text-white/60" />
            </div>
            <div className="flex flex-row justify-end gap-3 mt-4">
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
              O fruto do trabalho honrado alimenta os sonhos da família.
            </p>
          </div>
        </footer>
      </div>

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
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Data</p>
                  <p>{formatDate(detailIncome.date)}</p>
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
        onApply={(m, y) => {
          setSelectedMonth(m)
          setSelectedYear(y)
        }}
      />
    </AppLayout>
  )
}
