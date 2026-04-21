'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { ChartColumnBig, ChartPie, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import FilterSheet from '@/components/layout/FilterSheet'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import VintageCard from '@/components/ui/VintageCard'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
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
import { matchesSearch } from '@/lib/filterSearch'
import { formatBRL } from '@/lib/money'

interface Totals {
  income: number
  paid: number
  saved: number
  balance: number
}

type PieMetric = 'income' | 'paid' | 'saved'
type ChartMode = 'bars' | 'pie'
type MetricKey = 'income' | 'paid' | 'saved' | 'balance'

interface CategorySlice {
  label: string
  value: number
  color: string
}

interface BarDetailRow {
  date: string
  name: string
  category: string
  value: number
  source?: string
}

const METRIC_COLORS = {
  income: '#6FBF8A',
  paid: '#2F6F7E',
  saved: '#3689B5',
  balance: '#37669D',
}

const CATEGORY_PALETTE = [
  '#6FBF8A',
  '#2F6F7E',
  '#3689B5',
  '#4D7AB2',
  '#7A66A1',
  '#C2A45D',
  '#5E8E62',
  '#2D92B0',
  '#5578A2',
  '#8A6B8F',
]

const PIE_METRIC_LABELS: Record<PieMetric, string> = {
  income: 'Recebido',
  paid: 'Pago',
  saved: 'Poupado',
}

const buildColorizedSlices = (rows: Array<{ label: string; value: number }>): CategorySlice[] => {
  return rows
    .sort((a, b) => b.value - a.value)
    .map((row, index) => ({
      label: row.label,
      value: row.value,
      color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
    }))
}

export default function ComparativesPage() {
  const { familyId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [chartMode, setChartMode] = useState<ChartMode>('bars')
  const [selectedPieMetrics, setSelectedPieMetrics] = useState<PieMetric[]>(['paid'])
  const [monthlyTotals, setMonthlyTotals] = useState<Totals>({
    income: 0,
    paid: 0,
    saved: 0,
    balance: 0,
  })
  const [categorySlices, setCategorySlices] = useState<Record<PieMetric, CategorySlice[]>>({
    income: [],
    paid: [],
    saved: [],
  })
  const [barDetails, setBarDetails] = useState<Record<MetricKey, BarDetailRow[]>>({
    income: [],
    paid: [],
    saved: [],
    balance: [],
  })
  const [hoveredBar, setHoveredBar] = useState<MetricKey | null>(null)
  const pieScrollRef = useRef<HTMLDivElement | null>(null)
  const pieScrollIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem('app-filters-open')
    if (stored === '0') setFiltersOpen(false)
    if (stored === '1') setFiltersOpen(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('app-filters-open', filtersOpen ? '1' : '0')
  }, [filtersOpen])

  const stopPieAutoScroll = () => {
    if (pieScrollIntervalRef.current !== null) {
      window.clearInterval(pieScrollIntervalRef.current)
      pieScrollIntervalRef.current = null
    }
  }

  const startPieAutoScroll = (direction: 'left' | 'right') => {
    stopPieAutoScroll()
    pieScrollIntervalRef.current = window.setInterval(() => {
      const container = pieScrollRef.current
      if (!container) return
      const delta = direction === 'left' ? -8 : 8
      container.scrollBy({ left: delta, behavior: 'auto' })
    }, 24)
  }

  useEffect(() => {
    return () => {
      stopPieAutoScroll()
    }
  }, [])

  useEffect(() => {
    if (chartMode !== 'pie' || selectedPieMetrics.length < 3) {
      stopPieAutoScroll()
    }
  }, [chartMode, selectedPieMetrics.length])

  const chartItems = (totals: Totals) => ([
    { key: 'income' as MetricKey, label: 'Recebido', value: totals.income, color: METRIC_COLORS.income },
    { key: 'paid' as MetricKey, label: 'Pago', value: totals.paid, color: METRIC_COLORS.paid },
    { key: 'saved' as MetricKey, label: 'Poupado', value: totals.saved, color: METRIC_COLORS.saved },
    { key: 'balance' as MetricKey, label: 'Saldo', value: totals.balance, color: METRIC_COLORS.balance },
  ])

  const renderPie = (items: CategorySlice[], size: number) => {
    const positiveItems = items.filter((item) => item.value > 0)
    const total = positiveItems.reduce((sum, item) => sum + item.value, 0)
    const center = size / 2
    const radius = Math.floor(size * 0.44)

    if (total <= 0) {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="#E4D7C2" />
        </svg>
      )
    }

    if (positiveItems.length === 1) {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill={positiveItems[0].color} />
        </svg>
      )
    }

    let startAngle = -Math.PI / 2

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {positiveItems.map((item) => {
          const angle = (item.value / total) * Math.PI * 2
          const endAngle = startAngle + angle
          const x1 = center + radius * Math.cos(startAngle)
          const y1 = center + radius * Math.sin(startAngle)
          const x2 = center + radius * Math.cos(endAngle)
          const y2 = center + radius * Math.sin(endAngle)
          const largeArc = angle > Math.PI ? 1 : 0
          const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
          startAngle = endAngle
          return <path key={item.label} d={path} fill={item.color} />
        })}
      </svg>
    )
  }

  const loadCategorySlices = async () => {
    let incomeQuery = supabase
      .from('incomes')
      .select('description,category_name,amount_cents,date')
      .eq('family_id', familyId!)

    let paidQuery = supabase
      .from('expenses')
      .select('description,category_name,amount_cents,date')
      .eq('family_id', familyId!)
      .eq('status', 'paid')

    let dreamQuery = supabase
      .from('dream_contributions')
      .select('dream_id,amount_cents,date')
      .eq('family_id', familyId!)

    if (selectedYear !== ALL_YEARS_VALUE) {
      const { start, end } = getYearRange(selectedYear)
      const startDate = format(start, 'yyyy-MM-dd')
      const endDate = format(end, 'yyyy-MM-dd')
      incomeQuery = incomeQuery.gte('date', startDate).lte('date', endDate)
      paidQuery = paidQuery.gte('date', startDate).lte('date', endDate)
      dreamQuery = dreamQuery.gte('date', startDate).lte('date', endDate)
    }

    const [incomeRows, paidRows, dreamRows, dreamsRows] = await Promise.all([
      incomeQuery,
      paidQuery,
      dreamQuery,
      supabase
        .from('dreams')
        .select('id,name')
        .eq('family_id', familyId!),
    ])

    const dreamNameById = new Map<string, string>()
    for (const dream of dreamsRows.data || []) {
      dreamNameById.set(dream.id, dream.name)
    }

    const incomeDetails: BarDetailRow[] = (incomeRows.data || [])
      .map((row) => ({
        date: row.date,
        name: row.description || 'Sem nome',
        category: row.category_name || 'Sem categoria',
        value: row.amount_cents,
      }))
      .filter((row) => isDateWithinFilters(row.date, selectedMonth, selectedYear))
      .filter((row) => matchesSearch(searchTerm, row.name, row.category))
      .sort((a, b) => b.date.localeCompare(a.date))

    const paidDetails: BarDetailRow[] = (paidRows.data || [])
      .map((row) => ({
        date: row.date,
        name: row.description || 'Sem nome',
        category: row.category_name || 'Sem categoria',
        value: row.amount_cents,
      }))
      .filter((row) => isDateWithinFilters(row.date, selectedMonth, selectedYear))
      .filter((row) => matchesSearch(searchTerm, row.name, row.category))
      .sort((a, b) => b.date.localeCompare(a.date))

    const savedDetails: BarDetailRow[] = (dreamRows.data || [])
      .map((row) => {
        const dreamName = dreamNameById.get(row.dream_id) || 'Sem categoria'
        return {
          date: row.date,
          name: dreamName,
          category: dreamName,
          value: row.amount_cents,
        }
      })
      .filter((row) => isDateWithinFilters(row.date, selectedMonth, selectedYear))
      .filter((row) => matchesSearch(searchTerm, row.name, row.category))
      .sort((a, b) => b.date.localeCompare(a.date))

    const incomeByCategory = new Map<string, number>()
    for (const row of incomeDetails) {
      incomeByCategory.set(row.category, (incomeByCategory.get(row.category) || 0) + row.value)
    }

    const paidByCategory = new Map<string, number>()
    for (const row of paidDetails) {
      paidByCategory.set(row.category, (paidByCategory.get(row.category) || 0) + row.value)
    }

    const savedByCategory = new Map<string, number>()
    for (const row of savedDetails) {
      savedByCategory.set(row.category, (savedByCategory.get(row.category) || 0) + row.value)
    }

    const balanceDetails: BarDetailRow[] = [
      ...incomeDetails.map((row) => ({ ...row, source: 'Recebido' })),
      ...paidDetails.map((row) => ({ ...row, value: -row.value, source: 'Pago' })),
      ...savedDetails.map((row) => ({ ...row, value: -row.value, source: 'Poupado' })),
    ].sort((a, b) => b.date.localeCompare(a.date))

    setCategorySlices({
      income: buildColorizedSlices(Array.from(incomeByCategory.entries()).map(([label, value]) => ({ label, value }))),
      paid: buildColorizedSlices(Array.from(paidByCategory.entries()).map(([label, value]) => ({ label, value }))),
      saved: buildColorizedSlices(Array.from(savedByCategory.entries()).map(([label, value]) => ({ label, value }))),
    })
    setBarDetails({
      income: incomeDetails,
      paid: paidDetails,
      saved: savedDetails,
      balance: balanceDetails,
    })

    const incomeTotal = incomeDetails.reduce((sum, row) => sum + row.value, 0)
    const paidTotal = paidDetails.reduce((sum, row) => sum + row.value, 0)
    const savedTotal = savedDetails.reduce((sum, row) => sum + row.value, 0)
    setMonthlyTotals({
      income: incomeTotal,
      paid: paidTotal,
      saved: savedTotal,
      balance: incomeTotal - paidTotal - savedTotal,
    })
  }

  async function loadComparatives() {
    setLoading(true)
    await loadCategorySlices()
    setLoading(false)
  }

  useEffect(() => {
    if (familyId) {
      loadComparatives()
    }
    // The loaders are intentionally not stable references; the effect is driven by filters and search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear, searchTerm])

  const progress = monthlyTotals.income > 0
    ? Math.min(100, Math.round(((monthlyTotals.paid + monthlyTotals.saved) / monthlyTotals.income) * 100))
    : 0

  const monthlyItems = chartItems(monthlyTotals)
  const maxBar = Math.max(1, ...monthlyItems.map((item) => Math.abs(item.value)))
  const pieSize = selectedPieMetrics.length === 1 ? 400 : selectedPieMetrics.length === 2 ? 340 : 300

  const pieMetricData = useMemo(() => {
    return selectedPieMetrics.map((metric) => {
      const items = categorySlices[metric]
      const total = items.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1
      return { metric, items, total }
    })
  }, [selectedPieMetrics, categorySlices])
  const activeFiltersCount = [
    selectedMonth !== getCurrentMonth(),
    selectedYear !== getCurrentYear(),
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedMonth(getCurrentMonth())
    setSelectedYear(getCurrentYear())
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
  ]

  return (
    <AppLayout>
      <div className="flex flex-col h-full md:min-h-screen">
      <Topbar
        title="Comparativos"
        subtitle="Entender o passado nos ajuda a construir o futuro."
        variant="textured"
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden md:overflow-visible">
        {/* Mobile filter bar */}
        <div className="md:hidden border-b border-border bg-offWhite px-[18px] py-[10px] flex gap-[9px] items-center shrink-0">
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
                  type="button"
                  onClick={() => setChartMode('bars')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border transition-vintage text-sm ${
                    chartMode === 'bars'
                      ? 'bg-petrol text-white border-petrol'
                      : 'bg-bg text-petrol border-petrol/40'
                  }`}
                  aria-label="Ver gráfico de barras"
                >
                  <ChartColumnBig className="w-4 h-4" />
                  Barras
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('pie')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border transition-vintage text-sm ${
                    chartMode === 'pie'
                      ? 'bg-petrol text-white border-petrol'
                      : 'bg-bg text-petrol border-petrol/40'
                  }`}
                  aria-label="Ver gráfico de pizza"
                >
                  <ChartPie className="w-4 h-4" />
                  Pizza
                </button>
                {chartMode === 'pie' && (
                  <div className="flex flex-wrap items-center gap-2 sm:ml-2">
                    <span className="text-sm text-ink/60">Tipo:</span>
                    {([
                      { value: 'income', label: 'Recebido' },
                      { value: 'paid', label: 'Pago' },
                      { value: 'saved', label: 'Poupado' },
                    ] as Array<{ value: PieMetric; label: string }>).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedPieMetrics((prev) => {
                            if (prev.includes(option.value)) {
                              if (prev.length === 1) return prev
                              return prev.filter((value) => value !== option.value)
                            }
                            return [...prev, option.value]
                          })
                        }}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-vintage ${
                          selectedPieMetrics.includes(option.value)
                            ? 'bg-petrol text-white border-petrol'
                            : 'bg-bg text-petrol border-petrol/30'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            }
          />
        </div>

        {/* Scrollable content area — mobile only internal scroll */}
        <div className={`flex-1 min-h-0 overflow-y-auto md:overflow-visible w-full flex flex-col md:flex-row md:px-6 md:pb-4 ${filtersOpen ? 'md:gap-4' : 'md:gap-0'} md:items-stretch`}>
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
          </FilterSidebar>
          </div>

          <div className="flex-1 min-w-0 px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
            {loading ? (
              <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : (
              <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link
                  href="/receivables"
                  className="rounded-[12px] bg-offWhite border border-border px-4 py-3 shadow-soft hover:shadow-vintage transition-vintage"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METRIC_COLORS.income }} />
                    <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink/55">Recebido</span>
                  </div>
                  <div className="font-numbers tabular-nums text-lg font-bold text-ink">{formatBRL(monthlyTotals.income)}</div>
                </Link>
                <Link
                  href="/payables"
                  className="rounded-[12px] bg-offWhite border border-border px-4 py-3 shadow-soft hover:shadow-vintage transition-vintage"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METRIC_COLORS.paid }} />
                    <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink/55">Pago</span>
                  </div>
                  <div className="font-numbers tabular-nums text-lg font-bold text-ink">{formatBRL(monthlyTotals.paid)}</div>
                </Link>
                <Link
                  href="/dreams"
                  className="rounded-[12px] bg-offWhite border border-border px-4 py-3 shadow-soft hover:shadow-vintage transition-vintage"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METRIC_COLORS.saved }} />
                    <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink/55">Poupado</span>
                  </div>
                  <div className="font-numbers tabular-nums text-lg font-bold text-ink">{formatBRL(monthlyTotals.saved)}</div>
                </Link>
                <div className="rounded-[12px] bg-offWhite border border-border px-4 py-3 shadow-soft">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METRIC_COLORS.balance }} />
                    <span className="text-[10px] font-semibold tracking-[0.09em] uppercase text-ink/55">Saldo</span>
                  </div>
                  <div className="font-numbers tabular-nums text-lg font-bold text-ink">{formatBRL(monthlyTotals.balance)}</div>
                </div>
              </div>

              {chartMode === 'bars' ? (
                <VintageCard className="relative">
                  <div className="mb-4 flex flex-wrap items-center gap-6 text-sm text-ink/80">
                    {monthlyItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-[300px] grid grid-cols-4 gap-3 items-end">
                    {monthlyItems.map((item) => {
                      const isNegativeSaldo = item.label === 'Saldo' && item.value < 0
                      const positiveValue = Math.max(0, item.value)
                      const height = Math.round((positiveValue / maxBar) * 100)
                      const barHeight = isNegativeSaldo
                        ? '0%'
                        : positiveValue > 0
                          ? `${Math.max(12, height)}%`
                          : '8%'

                      return (
                        <div
                          key={item.label}
                          className="h-full flex flex-col"
                          onMouseEnter={() => setHoveredBar(item.key)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <div className="h-full flex items-end">
                            <div
                              className="w-full rounded-md"
                              style={{
                                height: barHeight,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-center text-sm font-semibold text-ink/80">{item.label}</div>
                          <div className="mt-1 text-center text-xs font-light font-numbers text-ink/45">
                            {formatBRL(item.value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                {hoveredBar && (
                  <div className="absolute right-4 top-4 w-[340px] max-w-[calc(100%-2rem)] rounded-lg border border-border bg-paper p-3 shadow-soft z-20">
                    <div className="text-sm font-semibold text-coffee mb-2">
                      Detalhes de {monthlyItems.find((item) => item.key === hoveredBar)?.label}
                    </div>
                    {barDetails[hoveredBar].length === 0 ? (
                      <div className="text-xs text-ink/50 italic">Sem dados no período.</div>
                    ) : (
                      <div className="max-h-56 overflow-auto space-y-1.5 pr-1">
                        {barDetails[hoveredBar].map((row, index) => (
                          <div key={`${row.date}-${row.category}-${index}`} className="text-xs text-ink/75">
                            <span className="font-numbers">{formatDate(row.date)}</span>
                            <span> • </span>
                            <span>{row.name}</span>
                            <span> • </span>
                            <span>{row.category}</span>
                            {row.source ? (
                              <>
                                <span> • </span>
                                <span>{row.source}</span>
                              </>
                            ) : null}
                            <span> • </span>
                            <span className="font-numbers">{formatBRL(row.value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </VintageCard>
              ) : (
                <VintageCard className="relative">
                  {selectedPieMetrics.length >= 3 && (
                    <>
                      <button
                        type="button"
                        onMouseEnter={() => startPieAutoScroll('left')}
                        onMouseLeave={stopPieAutoScroll}
                        onFocus={() => startPieAutoScroll('left')}
                        onBlur={stopPieAutoScroll}
                        aria-label="Rolar gráficos para a esquerda"
                        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-border bg-paper text-petrol shadow-soft"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onMouseEnter={() => startPieAutoScroll('right')}
                        onMouseLeave={stopPieAutoScroll}
                        onFocus={() => startPieAutoScroll('right')}
                        onBlur={stopPieAutoScroll}
                        aria-label="Rolar gráficos para a direita"
                        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-border bg-paper text-petrol shadow-soft"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <div ref={pieScrollRef} className="overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                    {pieMetricData.map(({ metric, items, total }) => (
                      <div key={metric} className="min-w-[520px] max-w-[560px]">
                        <h3 className="text-lg font-serif text-coffee mb-4">
                          Pizza por categoria | {PIE_METRIC_LABELS[metric]}
                        </h3>
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 min-h-[340px]">
                          {renderPie(items, pieSize)}
                          <div className="h-px w-full bg-border/80 lg:hidden" />
                          <div className="hidden lg:block w-px self-stretch bg-border/80" />
                          <div className="space-y-3 text-sm text-ink/80 min-w-[220px] max-h-[300px] overflow-auto pr-2">
                            {items.length === 0 ? (
                              <div className="text-ink/50 italic">Sem dados no período.</div>
                            ) : (
                              items.map((item) => {
                                const percent = Math.round((Math.max(0, item.value) / total) * 100)
                                return (
                                  <div key={item.label} className="flex items-start gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <div className="leading-tight">
                                      <div className="font-semibold">
                                        {item.label} <span className="text-ink/60">{percent}%</span>
                                      </div>
                                      <div className="font-numbers text-ink/55 text-xs mt-0.5">
                                        {formatBRL(item.value)}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                  {selectedPieMetrics.length === 0 && (
                    <div className="text-ink/50 italic">
                      Selecione ao menos um tipo para exibir a pizza.
                    </div>
                  )}
                </VintageCard>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Mobile footer — sticky outside scroll */}
        <div className="md:hidden shrink-0 h-[44px] border-t border-border bg-offWhite flex items-center justify-center px-6">
          <p className="text-center text-[13px] text-gold italic">
            O equilíbrio financeiro nasce quando cada número encontra seu lugar.
          </p>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="px-6 mb-4">
            <div className="flex flex-row justify-end gap-3">
              <button className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm">
                Gerar CSV
              </button>
              <button className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-bg hover:text-petrol transition-vintage text-sm">
                Gerar PDF
              </button>
            </div>
          </div>
          <div className="h-[76px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              O equilíbrio financeiro nasce quando cada número encontra seu lugar.
            </p>
          </div>
        </footer>
      </div>

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
      </div>
    </AppLayout>
  )
}
