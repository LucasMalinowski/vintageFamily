'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
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
import { PiggyBank, SlidersHorizontal, Search, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { matchesSearch } from '@/lib/filterSearch'
import FilterSheet from '@/components/layout/FilterSheet'

interface Saving {
  id: string
  name: string
  target_cents: number | null
  parent_id: string | null
  is_system: boolean
}

interface SavingNode extends Saving {
  children: Saving[]
}

interface Contribution {
  id: string
  saving_id: string
  amount_cents: number
  date: string
  notes: string | null
  type: string
}

const buildSavingTree = (savings: Saving[]): SavingNode[] => {
  const main = savings
    .filter((s) => !s.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return main.map((s) => ({
    ...s,
    children: savings
      .filter((child) => child.parent_id === s.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }))
}

const buildSavingLabelMap = (savings: Saving[]) => {
  const byId = new Map<string, Saving>(savings.map((s) => [s.id, s]))
  const labels = new Map<string, string>()

  for (const s of savings) {
    if (!s.parent_id) {
      labels.set(s.id, s.name)
      continue
    }
    const parent = byId.get(s.parent_id)
    labels.set(s.id, parent ? `${parent.name} / ${s.name}` : s.name)
  }

  return labels
}

const buildSavingOptions = (savings: Saving[]) => {
  const tree = buildSavingTree(savings)
  const options: Array<{ value: string; label: string }> = []

  for (const main of tree) {
    options.push({ value: main.id, label: main.name })
    for (const child of main.children) {
      options.push({ value: child.id, label: `-- ${main.name} / ${child.name}` })
    }
  }

  return options
}

const emptyTxForm = () => ({
  savingId: '',
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
})

export default function Savings() {
  const { familyId } = useAuth()
  const [savings, setSavings] = useState<Saving[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedSavingId, setSelectedSavingId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  // modals
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false)
  const [isSavingSettingsOpen, setIsSavingSettingsOpen] = useState(false)
  const [detailsSaving, setDetailsSaving] = useState<Saving | null>(null)
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null)
  const [detailsContributions, setDetailsContributions] = useState<Contribution[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [depositForm, setDepositForm] = useState(emptyTxForm())
  const [withdrawalForm, setWithdrawalForm] = useState(emptyTxForm())
  const [editForm, setEditForm] = useState({ name: '', target: '' })

  useEffect(() => {
    const stored = window.localStorage.getItem('app-filters-open')
    if (stored === '0') setFiltersOpen(false)
    if (stored === '1') setFiltersOpen(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('app-filters-open', filtersOpen ? '1' : '0')
  }, [filtersOpen])

  const savingLabelMap = useMemo(() => buildSavingLabelMap(savings), [savings])
  const savingOptions = useMemo(() => buildSavingOptions(savings), [savings])

  useEffect(() => {
    if (!selectedSavingId) return
    const exists = savings.some((s) => s.id === selectedSavingId)
    if (!exists) setSelectedSavingId('')
  }, [savings, selectedSavingId])

  const getSavingLabel = (savingId: string) =>
    savingLabelMap.get(savingId) || savings.find((s) => s.id === savingId)?.name || 'Categoria'

  async function loadSavings() {
    const { data } = await supabase
      .from('savings')
      .select('id,name,target_cents,parent_id,is_system')
      .eq('family_id', familyId!)
      .order('name')
    setSavings((data || []) as Saving[])
  }

  async function loadContributions() {
    setLoading(true)
    let query = supabase
      .from('savings_contributions')
      .select('*')
      .eq('family_id', familyId!)

    if (selectedYear !== ALL_YEARS_VALUE) {
      const { start, end } = getYearRange(selectedYear)
      query = query
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
    }

    query = query.order('date', { ascending: false })

    if (selectedSavingId) {
      query = query.eq('saving_id', selectedSavingId)
    }

    const { data } = await query
    setContributions(
      (data || []).filter((c) => isDateWithinFilters(c.date, selectedMonth, selectedYear)) as Contribution[]
    )
    setLoading(false)
  }

  useEffect(() => {
    if (familyId) {
      loadSavings()
      loadContributions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear, selectedSavingId])

  async function loadDetailsContributions(savingId: string) {
    setDetailsLoading(true)
    const { data } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('family_id', familyId!)
      .eq('saving_id', savingId)
      .order('date', { ascending: false })
    setDetailsContributions((data || []) as Contribution[])
    setDetailsLoading(false)
  }

  const handleDepositSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const amountCents = Math.round(parseFloat(depositForm.amount) * 100)
    if (!depositForm.savingId || !amountCents) return

    await supabase.from('savings_contributions').insert({
      family_id: familyId!,
      saving_id: depositForm.savingId,
      amount_cents: amountCents,
      date: depositForm.date,
      notes: depositForm.notes || null,
      type: 'deposit',
    })

    setIsDepositOpen(false)
    setDepositForm(emptyTxForm())
    loadSavings()
    loadContributions()
  }

  const handleWithdrawalSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const amountCents = Math.round(parseFloat(withdrawalForm.amount) * 100)
    if (!withdrawalForm.savingId || !amountCents) return

    await supabase.from('savings_contributions').insert({
      family_id: familyId!,
      saving_id: withdrawalForm.savingId,
      amount_cents: amountCents,
      date: withdrawalForm.date,
      notes: withdrawalForm.notes || null,
      type: 'withdrawal',
    })

    setIsWithdrawalOpen(false)
    setWithdrawalForm(emptyTxForm())
    loadSavings()
    loadContributions()
  }

  const handleEditSavingSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingSaving) return

    const targetCents = editForm.target ? Math.round(parseFloat(editForm.target) * 100) : null

    await supabase
      .from('savings')
      .update({ name: editForm.name.trim(), target_cents: targetCents })
      .eq('id', editingSaving.id)

    setEditingSaving(null)
    loadSavings()
  }

  const openDetails = (saving: Saving) => {
    setDetailsSaving(saving)
    loadDetailsContributions(saving.id)
  }

  const openEdit = (saving: Saving) => {
    setEditingSaving(saving)
    setEditForm({
      name: saving.name,
      target: saving.target_cents ? (saving.target_cents / 100).toFixed(2) : '',
    })
  }

  const savingTotals = useMemo(() => {
    const totals = new Map<string, { total: number; count: number; lastDate: string | null }>()
    savings.forEach((s) => totals.set(s.id, { total: 0, count: 0, lastDate: null }))

    contributions.forEach((c) => {
      const existing = totals.get(c.saving_id)
      if (!existing) return
      const delta = c.type === 'withdrawal' ? -c.amount_cents : c.amount_cents
      totals.set(c.saving_id, {
        total: existing.total + delta,
        count: existing.count + 1,
        lastDate: existing.lastDate || c.date,
      })
    })

    return totals
  }, [savings, contributions])

  const visibleSavings = (
    selectedSavingId ? savings.filter((s) => s.id === selectedSavingId) : savings
  ).filter((s) => matchesSearch(searchTerm, s.name, getSavingLabel(s.id)))

  const activeFiltersCount = [
    selectedMonth !== getCurrentMonth(),
    selectedYear !== getCurrentYear(),
    selectedSavingId !== '',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
    setSelectedSavingId('')
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
    ...(selectedSavingId
      ? [{ key: 'category', label: getSavingLabel(selectedSavingId), onRemove: () => setSelectedSavingId('') }]
      : []),
  ]

  return (
    <>
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
                  onClick={() => { setIsDepositOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 text-sm text-ink hover:bg-paper transition-vintage"
                >
                  Guardar em poupança
                </button>
                <button
                  onClick={() => { setIsWithdrawalOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 text-sm text-ink hover:bg-paper transition-vintage"
                >
                  Resgatar da poupança
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
                  onClick={() => setIsDepositOpen(true)}
                  className="min-w-[140px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setIsSavingSettingsOpen(true)}
                  className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm font-semibold"
                >
                  Categorias
                </button>
                <button
                  type="button"
                  onClick={() => setIsWithdrawalOpen(true)}
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
                  value={selectedSavingId}
                  onChange={setSelectedSavingId}
                  options={[{ value: '', label: 'Todas' }, ...savingOptions]}
                />
              </FilterSidebar>
            </div>

            <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
              {loading ? (
                <div className="text-center py-12 text-ink/60">Carregando...</div>
              ) : visibleSavings.length === 0 ? (
                <EmptyState
                  icon={<PiggyBank className="w-16 h-16" />}
                  message="Ainda não há poupanças cadastradas."
                  submessage="Use o botão + para adicionar uma poupança e registrar um valor guardado."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleSavings.map((saving) => {
                    const totals = savingTotals.get(saving.id)
                    const total = totals?.total ?? 0
                    const lastDate = totals?.lastDate

                    return (
                      <div
                        key={saving.id}
                        className="p-4 bg-offWhite rounded-[12px] border border-border hover:shadow-soft transition-vintage"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-row gap-2 items-end">
                            <h4 className="text-xl font-medium text-sidebar font-serif">{getSavingLabel(saving.id)}</h4>
                            {saving.is_system ? (
                              <span className="flex text-center text-[11px] h-5 px-2 py-0.5 my-0.5 rounded-full bg-gold/20 text-gold">Sistema</span>
                            ) : null}
                          </div>
                          <ActionMenu
                            onDeposit={() => { setDepositForm({ ...emptyTxForm(), savingId: saving.id }); setIsDepositOpen(true) }}
                            onWithdrawal={() => { setWithdrawalForm({ ...emptyTxForm(), savingId: saving.id }); setIsWithdrawalOpen(true) }}
                            onView={() => openDetails(saving)}
                            onEdit={() => openEdit(saving)}
                          />
                        </div>
                        <p className="text-sm text-ink/25 mb-2">
                          Última atualização {lastDate ? formatDate(lastDate) : '—'}
                        </p>
                        {saving.target_cents ? (
                          <p className="text-xs text-ink/40 mb-1">
                            Meta: {formatBRL(saving.target_cents)}
                          </p>
                        ) : null}
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
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 py-4 bg-olive text-white rounded-[16px] font-semibold text-base hover:bg-olive/90 transition-vintage shadow-soft"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsWithdrawalOpen(true)}
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
                onClick={() => setIsDepositOpen(true)}
                className="flex-1 py-4 bg-olive text-white rounded-[16px] font-semibold text-base hover:bg-olive/90 transition-vintage shadow-soft"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setIsWithdrawalOpen(true)}
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

      {/* Guardar modal */}
      <Modal isOpen={isDepositOpen} onClose={() => { setIsDepositOpen(false); setDepositForm(emptyTxForm()) }} title="Guardar na Poupança">
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          <Select
            label="Categoria"
            value={depositForm.savingId}
            onChange={(value) => setDepositForm({ ...depositForm, savingId: value })}
            options={savingOptions}
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
              min="0.01"
              required
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
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
              value={depositForm.date}
              onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label className="block font-serif font-body text-ink mb-2">Observação</label>
            <textarea
              value={depositForm.notes}
              onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder="Notas adicionais..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setIsDepositOpen(false); setDepositForm(emptyTxForm()) }} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage">
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Resgatar modal */}
      <Modal isOpen={isWithdrawalOpen} onClose={() => { setIsWithdrawalOpen(false); setWithdrawalForm(emptyTxForm()) }} title="Resgatar da Poupança">
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          <Select
            label="Categoria"
            value={withdrawalForm.savingId}
            onChange={(value) => setWithdrawalForm({ ...withdrawalForm, savingId: value })}
            options={savingOptions}
            required
            variant="modal"
          />
          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Valor a resgatar (R$) <span className="text-terracotta">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={withdrawalForm.amount}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
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
              value={withdrawalForm.date}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label className="block font-serif font-body text-ink mb-2">Observação</label>
            <textarea
              value={withdrawalForm.notes}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder="Motivo do resgate..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setIsWithdrawalOpen(false); setWithdrawalForm(emptyTxForm()) }} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-3 bg-terracotta text-paper rounded-lg hover:bg-terracotta/90 transition-vintage">
              Resgatar
            </button>
          </div>
        </form>
      </Modal>

      {/* Ver detalhes modal */}
      <Modal
        isOpen={!!detailsSaving}
        onClose={() => { setDetailsSaving(null); setDetailsContributions([]) }}
        title={detailsSaving ? getSavingLabel(detailsSaving.id) : ''}
      >
        {detailsLoading ? (
          <div className="text-center py-8 text-ink/60">Carregando...</div>
        ) : detailsContributions.length === 0 ? (
          <div className="text-center py-8 text-ink/50 text-sm">Nenhuma movimentação registrada.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {detailsContributions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-bg border border-border">
                <div className="flex items-center gap-2.5">
                  {c.type === 'withdrawal' ? (
                    <TrendingDown className="w-4 h-4 text-terracotta shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-olive shrink-0" />
                  )}
                  <div>
                    <p className="text-xs text-ink/50">{formatDate(c.date)}</p>
                    {c.notes ? <p className="text-xs text-ink/40 truncate max-w-[180px]">{c.notes}</p> : null}
                  </div>
                </div>
                <span className={`font-numbers font-semibold text-sm ${c.type === 'withdrawal' ? 'text-terracotta' : 'text-olive'}`}>
                  {c.type === 'withdrawal' ? '−' : '+'}{formatBRL(c.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Editar poupança modal */}
      <Modal
        isOpen={!!editingSaving}
        onClose={() => setEditingSaving(null)}
        title="Editar Poupança"
      >
        <form onSubmit={handleEditSavingSubmit} className="space-y-4">
          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Nome <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label className="block font-serif font-body text-ink mb-2">Meta (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editForm.target}
              onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Sem meta definida"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setEditingSaving(null)} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      <CategorySettingsModal
        isOpen={isSavingSettingsOpen}
        onClose={() => setIsSavingSettingsOpen(false)}
        familyId={familyId}
        scope="savings"
        onChanged={() => {
          loadSavings()
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
    </>
  )
}
