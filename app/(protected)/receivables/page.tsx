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
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, MONTHS, getYearOptions, getMonthRange } from '@/lib/dates'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
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
    const { start, end } = getMonthRange(selectedMonth, selectedYear)

    let query = supabase
      .from('incomes')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId)
    }

    const { data } = await query

    if (data) {
      setIncomes(data)
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
  ]

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title="Contas a Receber"
          subtitle="O fruto do trabalho em forma de números."
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
                onChange={(v) => setSelectedMonth(parseInt(v))}
                options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
              />
              <Select
                variant="filter"
                label="Ano"
                value={selectedYear.toString()}
                onChange={(v) => setSelectedYear(parseInt(v))}
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
            </FilterSidebar>

            <div className="flex-1 min-w-0 flex flex-col">

            {loading ? (
              <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : filteredIncomes.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-16 h-16" />}
                message="Ainda não há receitas registradas."
                submessage="Use o botão + para adicionar uma receita."
              />
            ) : (
              <div className="space-y-3">
                {filteredIncomes.map((income) => (
                  <div
                    key={income.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-medium text-sidebar font-serif">
                        {income.description}
                      </h4>
                      <p className="text-sm text-ink/50">
                        {getCategoryLabel(income.category_id, income.category_name)} • {formatDate(income.date)}
                      </p>
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
            )}
            </div>
          </div>

          <footer className="mt-auto w-full">
            <div className="px-6 mb-4">
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <div className="rounded-[16px] px-10 py-5 bg-olive text-white text-center shadow-soft min-w-[200px]">
                    <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Recebido</div>
                    <div className="font-numbers text-xl font-semibold">{formatBRL(total)}</div>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-sm uppercase tracking-wide text-ink/50">Total</div>
                  <div className="font-numbers text-xl font-semibold text-petrol">{filteredIncomes.length}</div>
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
                Acompanhe o que entra para decidir para onde a vida vai.
              </p>
            </div>
          </footer>
        </div>
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
                  <p>{getCategoryLabel(detailIncome.category_id, detailIncome.category_name)}</p>
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
    </AppLayout>
  )
}
