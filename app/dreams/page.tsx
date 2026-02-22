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
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, getMonthRange, getYearOptions, MONTHS } from '@/lib/dates'
import { PiggyBank } from 'lucide-react'
import { matchesSearch } from '@/lib/filterSearch'

interface Dream {
  id: string
  name: string
  target_cents: number | null
}

interface Contribution {
  id: string
  dream_id: string
  amount_cents: number
  date: string
  notes: string | null
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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditDreamModalOpen, setIsEditDreamModalOpen] = useState(false)
  const [editingDream, setEditingDream] = useState<Dream | null>(null)
  const [dreamNameInput, setDreamNameInput] = useState('')
  const [formData, setFormData] = useState({
    dreamId: '',
    dreamName: '',
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

  useEffect(() => {
    if (familyId) {
      loadDreams()
      loadContributions()
    }
  }, [familyId, selectedMonth, selectedYear, selectedDreamId])

  const loadDreams = async () => {
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('family_id', familyId!)
      .order('name')

    setDreams(data || [])
  }

  const loadContributions = async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth, selectedYear)
    let query = supabase
      .from('dream_contributions')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    if (selectedDreamId) {
      query = query.eq('dream_id', selectedDreamId)
    }

    const { data } = await query

    setContributions(data || [])
    setLoading(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({
      dreamId: '',
      dreamName: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    let dreamId = formData.dreamId

    if (dreamId === '__new__') {
      const dreamName = formData.dreamName.trim()
      if (!dreamName) return
      const { data: newDream } = await supabase
        .from('dreams')
        .insert({ family_id: familyId!, name: dreamName })
        .select('id')
        .single()

      if (!newDream?.id) return
      dreamId = newDream.id
    }

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

  const openEditDreamModal = (dream: Dream) => {
    setEditingDream(dream)
    setDreamNameInput(dream.name)
    setIsEditDreamModalOpen(true)
  }

  const closeEditDreamModal = () => {
    setEditingDream(null)
    setDreamNameInput('')
    setIsEditDreamModalOpen(false)
  }

  const handleRenameDream = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingDream || !familyId) return

    const nextName = dreamNameInput.trim()
    if (!nextName) return

    await supabase
      .from('dreams')
      .update({ name: nextName, updated_at: new Date().toISOString() })
      .eq('id', editingDream.id)
      .eq('family_id', familyId)

    closeEditDreamModal()
    loadDreams()
  }

  const handleDeleteDream = async (dream: Dream) => {
    if (!familyId) return
    if (!confirm(`Excluir a categoria "${dream.name}" e todos os aportes dela?`)) return

    await supabase
      .from('dream_contributions')
      .delete()
      .eq('family_id', familyId)
      .eq('dream_id', dream.id)

    await supabase
      .from('dreams')
      .delete()
      .eq('family_id', familyId)
      .eq('id', dream.id)

    if (selectedDreamId === dream.id) {
      setSelectedDreamId('')
    }

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
    : dreams).filter((dream) => matchesSearch(searchTerm, dream.name, dream.name))
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
    ...(selectedDreamId
      ? [{
          key: 'category',
          label: dreams.find((dream) => dream.id === selectedDreamId)?.name ?? 'Categoria',
          onRemove: () => setSelectedDreamId(''),
        }]
      : []),
  ]

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title="Poupança"
          subtitle="Todo grande sonho começa com pequenos passos."
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
                    onClick={() => setIsModalOpen(true)}
                    className="min-w-[140px] px-5 py-2 bg-sidebar text-white rounded-md hover:bg-olive/90 transition-vintage text-sm font-semibold"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, dreamId: '__new__' }))
                      setIsModalOpen(true)
                    }}
                    className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm font-semibold"
                  >
                    Nova Categoria
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
                onChange={(value) => setSelectedMonth(parseInt(value))}
                options={MONTHS.map((month) => ({ value: month.value.toString(), label: month.label }))}
              />
              <Select
                variant="filter"
                label="Ano"
                value={selectedYear.toString()}
                onChange={(value) => setSelectedYear(parseInt(value))}
                options={getYearOptions()}
              />
              <Select
                variant="filter"
                label="Categoria"
                value={selectedDreamId}
                onChange={setSelectedDreamId}
                options={[
                  { value: '', label: 'Todas' },
                  ...dreams.map((dream) => ({ value: dream.id, label: dream.name })),
                ]}
              />
            </FilterSidebar>

            <div className="flex-1 min-w-0 flex flex-col">

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
                        <h4 className="text-xl font-medium text-sidebar font-serif">{dream.name}</h4>
                        <ActionMenu
                          onView={() => setSelectedDreamId(dream.id)}
                          onEdit={() => openEditDreamModal(dream)}
                          onDelete={() => handleDeleteDream(dream)}
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

          <footer className="mt-auto w-full">
            <div className="px-6 mb-4">
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="rounded-[16px] px-10 py-5 bg-petrol text-white text-center shadow-soft min-w-[200px]">
                  <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Resgatado</div>
                  <div className="font-numbers text-xl font-semibold">{formatBRL(totalRedeemed)}</div>
                </div>
                <div className="rounded-[16px] px-10 py-5 bg-olive text-white text-center shadow-soft min-w-[200px]">
                  <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Poupado</div>
                  <div className="font-numbers text-xl font-semibold">{formatBRL(totalSaved)}</div>
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
                Guardar hoje para viver amanhã: cada contribuição carrega um desejo em silêncio.
              </p>
            </div>
          </footer>
        </div>
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
            options={[
              { value: '__new__', label: 'Nova categoria' },
              ...dreams.map((dream) => ({ value: dream.id, label: dream.name })),
            ]}
            required
          />

          {formData.dreamId === '__new__' && (
            <div>
              <label className="block font-body text-ink mb-2 font-serif">
                Nome da nova categoria <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.dreamName}
                onChange={(event) => setFormData({ ...formData, dreamName: event.target.value })}
                className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
                placeholder="Ex: Reforma da casa"
              />
            </div>
          )}

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

      <Modal
        isOpen={isEditDreamModalOpen}
        onClose={closeEditDreamModal}
        title="Editar Categoria"
      >
        <form onSubmit={handleRenameDream} className="space-y-4">
          <div>
            <label className="block font-body text-ink mb-2 font-serif">
              Nome da categoria <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={dreamNameInput}
              onChange={(event) => setDreamNameInput(event.target.value)}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder="Ex: Viagem"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeEditDreamModal}
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
    </AppLayout>
  )
}
