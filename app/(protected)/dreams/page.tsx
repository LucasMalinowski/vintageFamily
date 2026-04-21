'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import ActionMenu from '@/components/ui/ActionMenu'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/lib/money'
import {
  formatDate,
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
import { PiggyBank, SlidersHorizontal, Search, Plus } from 'lucide-react'
import { matchesSearch } from '@/lib/filterSearch'
import FilterSheet from '@/components/layout/FilterSheet'

interface Dream {
  id: string
  name: string
  target_cents: number | null
  parent_id: string | null
  is_system: boolean
}

interface DreamNode extends Dream {
  children: Dream[]
}

interface Contribution {
  id: string
  dream_id: string
  amount_cents: number
  date: string
  notes: string | null
}

const buildDreamTree = (dreams: Dream[]): DreamNode[] => {
  const main = dreams
    .filter((dream) => !dream.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return main.map((dream) => ({
    ...dream,
    children: dreams
      .filter((child) => child.parent_id === dream.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }))
}

const buildDreamLabelMap = (dreams: Dream[]) => {
  const byId = new Map<string, Dream>(dreams.map((dream) => [dream.id, dream]))
  const labels = new Map<string, string>()

  for (const dream of dreams) {
    if (!dream.parent_id) {
      labels.set(dream.id, dream.name)
      continue
    }

    const parent = byId.get(dream.parent_id)
    labels.set(dream.id, parent ? `${parent.name} / ${dream.name}` : dream.name)
  }

  return labels
}

const buildDreamOptions = (dreams: Dream[]) => {
  const tree = buildDreamTree(dreams)
  const options: Array<{ value: string; label: string }> = []

  for (const main of tree) {
    options.push({ value: main.id, label: main.name })
    for (const child of main.children) {
      options.push({ value: child.id, label: `-- ${main.name} / ${child.name}` })
    }
  }

  return options
}

export default function DreamsPage() {
  const { familyId } = useAuth()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedDreamId, setSelectedDreamId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDreamSettingsOpen, setIsDreamSettingsOpen] = useState(false)
  const [formData, setFormData] = useState({
    dreamId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  useEffect(() => {
    const stored = window.localStorage.getItem('app-filters-open')
    if (stored === '0') setFiltersOpen(false)
    if (stored === '1') setFiltersOpen(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('app-filters-open', filtersOpen ? '1' : '0')
  }, [filtersOpen])

  const dreamLabelMap = useMemo(() => buildDreamLabelMap(dreams), [dreams])
  const dreamOptions = useMemo(() => buildDreamOptions(dreams), [dreams])

  useEffect(() => {
    if (!selectedDreamId) return
    const exists = dreams.some((dream) => dream.id === selectedDreamId)
    if (!exists) {
      setSelectedDreamId('')
    }
  }, [dreams, selectedDreamId])

  const getDreamLabel = (dreamId: string) => {
    return dreamLabelMap.get(dreamId) || dreams.find((dream) => dream.id === dreamId)?.name || 'Categoria'
  }

  async function loadDreams() {
    const { data } = await supabase
      .from('dreams')
      .select('id,name,target_cents,parent_id,is_system')
      .eq('family_id', familyId!)
      .order('name')

    setDreams((data || []) as Dream[])
  }

  async function loadContributions() {
    setLoading(true)
    let query = supabase
      .from('dream_contributions')
      .select('*')
      .eq('family_id', familyId!)

    if (selectedYear !== ALL_YEARS_VALUE) {
      const { start, end } = getYearRange(selectedYear)
      query = query
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
    }

    query = query.order('date', { ascending: false })

    if (selectedDreamId) {
      query = query.eq('dream_id', selectedDreamId)
    }

    const { data } = await query

    setContributions((data || []).filter((contribution) => isDateWithinFilters(contribution.date, selectedMonth, selectedYear)))
    setLoading(false)
  }

  useEffect(() => {
    if (familyId) {
      loadDreams()
      loadContributions()
    }
    // The loaders are intentionally not stable references; the effect is driven by the filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear, selectedDreamId])

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({
      dreamId: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const dreamId = formData.dreamId

    if (!dreamId) return

    await supabase.from('dream_contributions').insert({
      family_id: familyId!,
      dream_id: dreamId,
      amount_cents: amountCents,
      date: formData.date,
      notes: formData.notes || null,
    })

    closeModal()
    loadDreams()
    loadContributions()
  }

  const dreamTotals = useMemo(() => {
    const totals = new Map<string, { total: number; count: number; lastDate: string | null }>()
    dreams.forEach((dream) => {
      totals.set(dream.id, { total: 0, count: 0, lastDate: null })
    })

    contributions.forEach((contribution) => {
      const existing = totals.get(contribution.dream_id)
      if (!existing) return
      totals.set(contribution.dream_id, {
        total: existing.total + contribution.amount_cents,
        count: existing.count + 1,
        lastDate: existing.lastDate || contribution.date,
      })
    })

    return totals
  }, [dreams, contributions])

  const totalSaved = contributions.reduce((sum, contribution) => sum + contribution.amount_cents, 0)
  const totalRedeemed = 0
  const visibleDreams = (selectedDreamId
    ? dreams.filter((dream) => dream.id === selectedDreamId)
    : dreams).filter((dream) => matchesSearch(searchTerm, dream.name, getDreamLabel(dream.id)))
  const activeFiltersCount = [
    selectedMonth !== getCurrentMonth(),
    selectedYear !== getCurrentYear(),
    selectedDreamId !== '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    setSelectedDreamId('')
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
    ...(selectedDreamId
      ? [{
          key: 'category',
          label: getDreamLabel(selectedDreamId),
          onRemove: () => setSelectedDreamId(''),
        }]
      : []),
  ]

  return (
    <AppLayout>
      <div className="flex flex-col h-full md:min-h-screen">
        <Topbar
          title="Poupança"
          subtitle="Todo grande sonho começa com pequenos passos."
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
              <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-52 overflow-hidden animate-popup-in">
                <button
                  onClick={() => { setIsModalOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 text-sm text-ink hover:bg-paper transition-vintage"
                >
                  Guardar em sonho
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
                  onClick={() => setIsModalOpen(true)}
                  className="min-w-[140px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setIsDreamSettingsOpen(true)}
                  className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm font-semibold"
                >
                  Categorias
                </button>
                <button
                  type="button"
                  className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm font-semibold"
                >
                  Resgatar
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
                  onChange={(value) => setSelectedMonth(parseInt(value))}
                  options={getMonthOptions(true)}
                />
                <Select
                  variant="filter"
                  label="Ano"
                  value={selectedYear.toString()}
                  onChange={(value) => setSelectedYear(parseInt(value))}
                  options={getYearOptions(2020, true)}
                />
                <Select
                  variant="filter"
                  label="Categoria"
                  value={selectedDreamId}
                  onChange={setSelectedDreamId}
                  options={[
                    { value: '', label: 'Todas' },
                    ...dreamOptions,
                  ]}
                />
              </FilterSidebar>
            </div>

            <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
              {loading ? (
                <div className="text-center py-12 text-ink/60">Carregando...</div>
              ) : visibleDreams.length === 0 ? (
                <EmptyState
                  icon={<PiggyBank className="w-16 h-16" />}
                  message="Ainda não há sonhos cadastrados."
                  submessage="Use o botão + para adicionar um sonho e registrar um valor poupado."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleDreams.map((dream) => {
                    const totals = dreamTotals.get(dream.id)
                    const total = totals?.total ?? 0
                    const lastDate = totals?.lastDate

                    return (
                      <div
                        key={dream.id}
                        className="p-4 bg-offWhite rounded-[12px] border border-border hover:shadow-soft transition-vintage"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-row gap-2 items-end">
                            <h4 className="text-xl font-medium text-sidebar font-serif">{getDreamLabel(dream.id)}</h4>
                            {dream.is_system ? (
                              <span className="flex text-center text-[11px] h-5 px-2 py-0.5 my-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                            ) : null}
                          </div>
                          <ActionMenu
                            onView={() => setSelectedDreamId(dream.id)}
                          />
                        </div>
                        <p className="text-sm text-ink/25 mb-2">
                          Última atualização {lastDate ? formatDate(lastDate) : '—'}
                        </p>
                        <div className="text-center">
                          <div className="font-numbers text-3xl font-semibold text-sidebar leading-tight">
                            {formatBRL(total)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile footer — sticky outside scroll */}
        <div className="md:hidden shrink-0 px-[18px] pt-3 pb-2 border-t border-border bg-offWhite">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 py-4 bg-olive text-white rounded-[16px] font-semibold text-base hover:bg-olive/90 transition-vintage shadow-soft"
            >
              Guardar
            </button>
            <button
              type="button"
              className="flex-1 py-4 bg-paper text-ink border border-border rounded-[16px] font-semibold text-base hover:bg-bg transition-vintage shadow-soft"
            >
              Resgatar
            </button>
          </div>
          <div className="h-[44px] flex items-center justify-center">
            <p className="text-center text-[13px] text-gold italic">
              Poupança é um abraço longo no amanhã.
            </p>
          </div>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="px-6 mb-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex-1 py-4 bg-olive text-white rounded-[16px] font-semibold text-base hover:bg-olive/90 transition-vintage shadow-soft"
              >
                Guardar
              </button>
              <button
                type="button"
                className="flex-1 py-4 bg-paper text-ink border border-border rounded-[16px] font-semibold text-base hover:bg-bg transition-vintage shadow-soft"
              >
                Resgatar
              </button>
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
              Poupança é um abraço longo no amanhã.
            </p>
          </div>
        </footer>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Nova Poupança"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Categoria do sonho"
            value={formData.dreamId}
            onChange={(value) => setFormData({ ...formData, dreamId: value })}
            options={dreamOptions}
            required
            variant="modal"
          />

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Valor poupado (R$) <span className="text-terracotta">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, date: event.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Observação
            </label>
            <textarea
              value={formData.notes}
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
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

      <CategorySettingsModal
        isOpen={isDreamSettingsOpen}
        onClose={() => setIsDreamSettingsOpen(false)}
        familyId={familyId}
        scope="dreams"
        onChanged={() => {
          loadDreams()
          loadContributions()
        }}
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
