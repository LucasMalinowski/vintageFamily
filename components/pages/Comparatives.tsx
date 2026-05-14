'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Link from 'next/link'
import { ChartColumnBig, CreditCard, FileDown, FileText, MoreVertical, PiggyBank, SlidersHorizontal, TrendingUp, Wallet } from 'lucide-react'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import SankeyChart, { SankeyNode, SankeyLink } from '@/components/ui/SankeyChart'
import LineChart, { LineSeries } from '@/components/ui/LineChart'
import DonutChart, { DonutSlice } from '@/components/ui/DonutChart'
import HBarChart, { HBarItem } from '@/components/ui/HBarChart'
import FilterSheet from '@/components/layout/FilterSheet'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import VintageCard from '@/components/ui/VintageCard'
import Select from '@/components/ui/Select'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { usePlan } from '@/lib/billing/plan-context'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import {
  formatDate,
  getCurrentMonth,
  getCurrentYear,
  getMonthLabel,
  getMonthRange,
  getYearLabel,
  getYearRange,
  isDateWithinFilters,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { matchesSearch } from '@/lib/filterSearch'
import { formatBRL } from '@/lib/money'
import { buildPdfBlob, downloadBlob, downloadCsv } from '@/lib/report-export'

interface Totals {
  income: number
  paid: number
  saved: number
  balance: number
}

type PieMetric = 'income' | 'paid' | 'saved'
type ChartMode = 'flow' | 'bars'
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

const buildColorizedSlices = (rows: Array<{ label: string; value: number }>): CategorySlice[] => {
  return rows
    .sort((a, b) => b.value - a.value)
    .map((row, index) => ({
      label: row.label,
      value: row.value,
      color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
    }))
}

export default function Comparatives() {
  const { familyId } = useAuth()
  const { tier } = usePlan()
  const isFreeTier = tier === 'free'
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [chartMode, setChartMode] = useState<ChartMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('dashboard-chart-view')
      if (stored === 'bars' || stored === 'flow') return stored as ChartMode
    }
    return 'flow'
  })
  const [trendData, setTrendData] = useState<{ label: string; income: number; paid: number; saved: number }[]>([])
  const [paymentMethodItems, setPaymentMethodItems] = useState<HBarItem[]>([])
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
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)

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

  const chartItems = (totals: Totals) => ([
    { key: 'income' as MetricKey, label: 'Recebido', value: totals.income, color: METRIC_COLORS.income },
    { key: 'paid' as MetricKey, label: 'Pago', value: totals.paid, color: METRIC_COLORS.paid },
    { key: 'saved' as MetricKey, label: 'Poupado', value: totals.saved, color: METRIC_COLORS.saved },
    { key: 'balance' as MetricKey, label: 'Saldo', value: totals.balance, color: METRIC_COLORS.balance },
  ])

  const loadCategorySlices = async () => {
    let incomeQuery = supabase
      .from('incomes')
      .select('description,category_name,amount_cents,date')
      .eq('family_id', familyId!)
      .eq('status', 'received')

    let paidQuery = supabase
      .from('expenses')
      .select('description,category_name,amount_cents,date,payment_method')
      .eq('family_id', familyId!)
      .eq('status', 'paid')

    let dreamQuery = supabase
      .from('savings_contributions')
      .select('saving_id,amount_cents,date,type')
      .eq('family_id', familyId!)

    if (selectedYear !== ALL_YEARS_VALUE) {
      const { start, end } = getYearRange(selectedYear)
      const startDate = format(start, 'yyyy-MM-dd')
      const endDate = format(end, 'yyyy-MM-dd')
      incomeQuery = incomeQuery.gte('date', startDate).lte('date', endDate)
      paidQuery = paidQuery.gte('date', startDate).lte('date', endDate)
      dreamQuery = dreamQuery.gte('date', startDate).lte('date', endDate)
    }

    const [incomeRows, paidRows, savingsRows, savingsListRows] = await Promise.all([
      incomeQuery.limit(2000),
      paidQuery.limit(2000),
      dreamQuery.limit(2000),
      supabase
        .from('savings')
        .select('id,name')
        .eq('family_id', familyId!),
    ])

    const savingNameById = new Map<string, string>()
    for (const saving of savingsListRows.data || []) {
      savingNameById.set(saving.id, saving.name)
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

    const savedDetails: BarDetailRow[] = (savingsRows.data || [])
      .filter((row: { type?: string }) => row.type !== 'withdrawal')
      .map((row) => {
        const savingName = savingNameById.get(row.saving_id) || 'Sem categoria'
        return {
          date: row.date,
          name: savingName,
          category: savingName,
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

    // Payment method breakdown from paid expenses
    const methodMap = new Map<string, number>()
    ;(paidRows.data || [])
      .filter((r) => isDateWithinFilters(r.date, selectedMonth, selectedYear))
      .forEach((r: { payment_method?: string | null; amount_cents: number }) => {
        const m = r.payment_method || 'Outro'
        methodMap.set(m, (methodMap.get(m) || 0) + r.amount_cents)
      })
    const methodTotal = Array.from(methodMap.values()).reduce((s, v) => s + v, 0) || 1
    const METHOD_COLORS: Record<string, string> = {
      PIX: '#6FBF8A', Credito: '#2F6F7E', Debito: '#3689B5', Outro: '#C2A45D',
    }
    const allMethods = ['PIX', 'Credito', 'Debito', 'Outro']
    setPaymentMethodItems(
      allMethods.map((m) => {
        const val = methodMap.get(m) || 0
        return { label: m === 'Credito' ? 'Crédito' : m === 'Debito' ? 'Débito' : m, value: val, pct: Math.round((val / methodTotal) * 100), color: METHOD_COLORS[m] }
      }).filter((i) => i.value > 0),
    )

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear, searchTerm])

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    ;(async () => {
      const now = new Date()
      const historyMonths = isFreeTier ? 2 : 6
      const months = Array.from({ length: historyMonths }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (historyMonths - 1) + i, 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      })
      const results = await Promise.all(
        months.map(async ({ year, month }) => {
          const { start, end } = getMonthRange(month, year)
          const startStr = format(start, 'yyyy-MM-dd')
          const endStr = format(end, 'yyyy-MM-dd')
          const [incRes, paidRes, savRes] = await Promise.all([
            supabase.from('incomes').select('amount_cents').eq('family_id', familyId).gte('date', startStr).lte('date', endStr),
            supabase.from('expenses').select('amount_cents').eq('family_id', familyId).eq('status', 'paid').gte('date', startStr).lte('date', endStr),
            supabase.from('savings_contributions').select('amount_cents,type').eq('family_id', familyId).gte('date', startStr).lte('date', endStr),
          ])
          const income = (incRes.data || []).reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0)
          const paid = (paidRes.data || []).reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0)
          const saved = (savRes.data || []).reduce((s: number, r: { amount_cents: number; type: string }) => s + (r.type !== 'withdrawal' ? r.amount_cents : -r.amount_cents), 0)
          const label = `${getMonthLabel(month).slice(0, 3)}/${String(year).slice(2)}`
          return { label, income, paid, saved }
        }),
      )
      if (!cancelled) setTrendData(results)
    })()
    return () => { cancelled = true }
  }, [familyId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-chart-view', chartMode)
    }
  }, [chartMode])

  const progress = monthlyTotals.income > 0
    ? Math.min(100, Math.round(((monthlyTotals.paid + monthlyTotals.saved) / monthlyTotals.income) * 100))
    : 0

  const monthlyItems = chartItems(monthlyTotals)
  const maxBar = Math.max(1, ...monthlyItems.map((item) => Math.abs(item.value)))

  // Comparatives Sankey
  const comparativesSankeyData = useMemo(() => {
    const { income, paid, saved } = monthlyTotals
    if (income <= 0) return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] }

    const nodes: SankeyNode[] = [
      { id: 'recv', col: 0, label: 'Recebido', value: income, color: '#6FBF8A' },
    ]
    const links: SankeyLink[] = []

    if (paid > 0) {
      nodes.push({ id: 'paid_n', col: 1, label: 'Pago', value: paid, color: '#2F6F7E' })
      links.push({ from: 'recv', to: 'paid_n', value: paid, color: '#2F6F7E' })
      categorySlices.paid.slice(0, 6).forEach((cat, i) => {
        const id = `cat_${i}`
        nodes.push({ id, col: 2, label: cat.label, value: cat.value, color: cat.color })
        links.push({ from: 'paid_n', to: id, value: cat.value, color: cat.color })
      })
    }
    if (saved > 0) {
      nodes.push({ id: 'savd', col: 1, label: 'Poupado', value: saved, color: '#3689B5' })
      links.push({ from: 'recv', to: 'savd', value: saved, color: '#3689B5' })
    }

    return { nodes, links }
  }, [monthlyTotals, categorySlices])

  // Donut for expenses by category
  const expenseDonutSlices = useMemo((): DonutSlice[] => {
    const total = categorySlices.paid.reduce((s, c) => s + c.value, 0) || 1
    return categorySlices.paid.slice(0, 8).map((c) => ({
      label: c.label,
      value: c.value,
      pct: Math.round((c.value / total) * 100),
      color: c.color,
    }))
  }, [categorySlices.paid])

  // Trend series (multi-line)
  const trendSeries = useMemo((): LineSeries[] => {
    if (!trendData.length) return []
    return [
      { label: 'Recebido', data: trendData.map((d) => d.income / 100), color: '#6FBF8A' },
      { label: 'Pago', data: trendData.map((d) => d.paid / 100), color: '#2F6F7E' },
      { label: 'Poupado', data: trendData.map((d) => d.saved / 100), color: '#3689B5' },
      { label: 'Saldo', data: trendData.map((d) => (d.income - d.paid - d.saved) / 100), color: '#C2A45D' },
    ]
  }, [trendData])

  // KPI delta: find prev month relative to the selected filter month
  const prevMonthTrendData = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE) return null
    const pm = selectedMonth === 1 ? 12 : selectedMonth - 1
    const effectiveYear = selectedYear || getCurrentYear()
    const py = selectedMonth === 1 ? effectiveYear - 1 : effectiveYear
    const expectedLabel = `${getMonthLabel(pm).slice(0, 3)}/${String(py).slice(2)}`
    return trendData.find((d) => d.label === expectedLabel) ?? null
  }, [selectedMonth, selectedYear, trendData])

  const mkDelta = (cur: number, prev: number | undefined) => {
    if (prev === undefined || prev === null) return undefined
    if (cur === 0 && prev === 0) return undefined
    if (prev === 0) return { pct: 100, positive: cur > 0 }
    const pct = Math.round(((cur - prev) / prev) * 100)
    return { pct, positive: pct >= 0 }
  }
  const incDelta = mkDelta(monthlyTotals.income, prevMonthTrendData?.income)
  const paidDeltaComp = mkDelta(monthlyTotals.paid, prevMonthTrendData?.paid)
  const savedDelta = mkDelta(monthlyTotals.saved, prevMonthTrendData?.saved)
  const prevMonthLabelComp = prevMonthTrendData?.label
  const balanceIsNeg = monthlyTotals.balance < 0

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

  const exportRows = [
    ...monthlyItems.map((item) => [
      'Resumo',
      item.label,
      '',
      '',
      formatBRL(item.value),
      '',
    ]),
    ...((['income', 'paid', 'saved', 'balance'] as MetricKey[]).flatMap((metric) =>
      barDetails[metric].map((row) => [
        'Barras',
        metric === 'income' ? 'Recebido' : metric === 'paid' ? 'Pago' : metric === 'saved' ? 'Poupado' : 'Saldo',
        row.name,
        row.date ? formatDate(row.date) : '',
        formatBRL(row.value),
        row.source || '',
      ]),
    )),
  ]

  const exportSubtitle = [
    `Período: ${selectedMonth === ALL_MONTHS_VALUE ? 'todos os meses' : getMonthLabel(selectedMonth)} / ${selectedYear === ALL_YEARS_VALUE ? 'todos os anos' : getYearLabel(selectedYear)}`,
    chartMode === 'bars' ? 'Visão em barras' : 'Visão em fluxo',
    searchTerm ? `Busca: ${searchTerm}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `comparativos-${format(new Date(), 'yyyy-MM-dd')}`,
    title: 'Comparativos',
    subtitle: exportSubtitle,
    headers: ['Seção', 'Métrica', 'Item', 'Data', 'Valor', 'Origem'],
    rows: exportRows,
  }

  const closePdfModal = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl('')
    setPdfBlob(null)
    setIsPdfModalOpen(false)
  }

  const openPdfPreview = async () => {
    setExportingFormat('pdf')
    setPdfGenerating(true)
    setPdfUrl('')
    setPdfBlob(null)
    setIsPdfModalOpen(true)

    try {
      const blob = await buildPdfBlob(exportTable)
      setPdfBlob(blob)
      setPdfUrl(URL.createObjectURL(blob))
    } finally {
      setPdfGenerating(false)
      setExportingFormat(null)
    }
  }

  const downloadPreviewPdf = async () => {
    if (pdfBlob) {
      downloadBlob(`${exportTable.filename}.pdf`, pdfBlob)
      return
    }

    const blob = await buildPdfBlob(exportTable)
    downloadBlob(`${exportTable.filename}.pdf`, blob)
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
      alert('Você atingiu o limite de 3 exportações/importações gratuitas este mês.\n\nAssine o Florim Pro em florim.app/pricing para continuar.')
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
        title="Comparativos"
        subtitle="Entender o passado nos ajuda a construir o futuro."
        variant="textured"
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden md:overflow-visible">
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
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-56 overflow-hidden animate-popup-in">
                <button
                  onClick={() => { handleExportCsv(); setMobileMenuOpen(false) }}
                  disabled={exportingFormat !== null}
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
                  onClick={() => { handleExportPdf(); setMobileMenuOpen(false) }}
                  disabled={exportingFormat !== null}
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
            <MonthYearPicker
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
            />
          </FilterSidebar>
          </div>

          <div className="flex-1 min-w-0 px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
            {loading ? (
              <div className="text-center py-12 text-ink/60">Carregando...</div>
            ) : (
              <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AnalyticsKpiCard
                  label="Recebido"
                  value={formatBRL(monthlyTotals.income)}
                  sub={incDelta ? `${incDelta.positive ? '↑' : '↓'} ${Math.abs(incDelta.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={incDelta?.positive}
                  subNegative={incDelta ? !incDelta.positive : false}
                  iconTheme="green"
                  icon={TrendingUp}
                />
                <AnalyticsKpiCard
                  label="Pago"
                  value={formatBRL(monthlyTotals.paid)}
                  sub={paidDeltaComp ? `${paidDeltaComp.positive ? '↑' : '↓'} ${Math.abs(paidDeltaComp.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={paidDeltaComp?.positive}
                  subNegative={paidDeltaComp ? !paidDeltaComp.positive : false}
                  iconTheme="blue"
                  icon={CreditCard}
                />
                <AnalyticsKpiCard
                  label="Poupado"
                  value={formatBRL(monthlyTotals.saved)}
                  sub={savedDelta ? `${savedDelta.positive ? '↑' : '↓'} ${Math.abs(savedDelta.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={savedDelta?.positive}
                  subNegative={savedDelta ? !savedDelta.positive : false}
                  iconTheme="purple"
                  icon={PiggyBank}
                />
                <AnalyticsKpiCard
                  label="Saldo"
                  value={formatBRL(monthlyTotals.balance)}
                  iconTheme={balanceIsNeg ? 'red' : 'orange'}
                  icon={Wallet}
                />
              </div>

              {/* Main chart: Fluxo | Barras toggle */}
              <VintageCard className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-serif font-semibold text-coffee">Fluxo do dinheiro</h3>
                  <div className="flex gap-1 bg-bg border border-border rounded-lg p-0.5">
                    {(['flow', 'bars'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartMode(mode)}
                        className={`px-3.5 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors ${
                          chartMode === mode ? 'bg-petrol text-white' : 'text-ink/50 hover:text-ink'
                        }`}
                      >
                        {mode === 'flow' ? 'Fluxo' : 'Barras'}
                      </button>
                    ))}
                  </div>
                </div>

                {chartMode === 'flow' ? (
                  comparativesSankeyData.nodes.length > 0 ? (
                    <>
                      {/* Desktop: full 3-col */}
                      <div className="hidden md:block">
                        <SankeyChart
                          nodes={comparativesSankeyData.nodes}
                          links={comparativesSankeyData.links}
                          width={560}
                          height={230}
                        />
                      </div>
                      {/* Mobile: col 0+1 with links */}
                      <div className="md:hidden">
                        {(() => {
                          const mn = comparativesSankeyData.nodes.filter(n => n.col < 2)
                          const mids = new Set(mn.map(n => n.id))
                          const ml = comparativesSankeyData.links.filter(l => mids.has(l.from) && mids.has(l.to))
                          return <SankeyChart nodes={mn} links={ml} width={300} height={120} />
                        })()}
                      </div>
                    </>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-ink/40">
                      Sem dados para o período selecionado.
                    </div>
                  )
                ) : (
                  <>
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
                        const barHeight = isNegativeSaldo ? '0%' : positiveValue > 0 ? `${Math.max(12, height)}%` : '8%'
                        return (
                          <div
                            key={item.label}
                            className="h-full flex flex-col"
                            onMouseEnter={() => setHoveredBar(item.key)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            <div className="h-full flex items-end">
                              <div className="w-full rounded-md" style={{ height: barHeight, backgroundColor: item.color }} />
                            </div>
                            <div className="mt-2 text-center text-sm font-semibold text-ink/80">{item.label}</div>
                            <div className="mt-1 text-center text-xs font-light font-numbers text-ink/45">{formatBRL(item.value)}</div>
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
                                <span> • </span><span>{row.name}</span>
                                <span> • </span><span>{row.category}</span>
                                {row.source && (<><span> • </span><span>{row.source}</span></>)}
                                <span> • </span>
                                <span className="font-numbers">{formatBRL(row.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </VintageCard>

              {/* 3-card secondary row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resumo do mês */}
                <div className="bg-white rounded-xl border border-border shadow-soft p-4">
                  <h3 className="text-sm font-semibold text-ink font-serif mb-3">Resumo do mês</h3>
                  {[
                    { label: 'Total recebido', value: monthlyTotals.income, color: '#6FBF8A' },
                    { label: 'Total pago', value: monthlyTotals.paid, color: '#2F6F7E' },
                    { label: 'Total poupado', value: monthlyTotals.saved, color: '#3689B5' },
                    { label: 'Saldo', value: monthlyTotals.balance, color: monthlyTotals.balance < 0 ? '#C06060' : '#C2A45D' },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-[7px] border-b border-border/40 last:border-0">
                      <span className="text-[12px] text-ink/70">{r.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: r.color }}>{formatBRL(r.value)}</span>
                    </div>
                  ))}
                </div>

                {/* Despesas por categoria */}
                <div className="bg-white rounded-xl border border-border shadow-soft p-4">
                  <h3 className="text-sm font-semibold text-ink font-serif mb-3">Despesas por categoria</h3>
                  {expenseDonutSlices.length > 0 ? (
                    <DonutChart
                      slices={expenseDonutSlices}
                      center={formatBRL(monthlyTotals.paid).replace('R$ ', '')}
                    />
                  ) : (
                    <div className="text-sm text-ink/40 italic">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Trend chart */}
              <VintageCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-serif font-semibold text-coffee">Evolução mensal</h3>
                  <div className="hidden md:flex items-center gap-4">
                    {trendSeries.map((s) => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <div className="w-[10px] h-[10px] rounded-full" style={{ background: s.color }} />
                        <span className="text-[11px] text-ink/60">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {trendSeries.length > 0 ? (
                  <LineChart series={trendSeries} labels={trendData.map(d => d.label)} height={150} />
                ) : (
                  <div className="h-[130px] flex items-center justify-center text-sm text-ink/40">Carregando...</div>
                )}
              </VintageCard>

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
          <div className="h-[76px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              O equilíbrio financeiro nasce quando cada número encontra seu lugar.
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
        onDownload={downloadPreviewPdf}
        downloadLabel="Imprimir ou salvar"
        previewLabel="Preview do PDF"
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
    </div>
  )
}
