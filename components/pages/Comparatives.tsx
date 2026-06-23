'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format } from 'date-fns'
import Link from 'next/link'
import { Bell, BellOff, ChartColumnBig, ChevronDown, CreditCard, FileDown, FileText, MoreVertical, PiggyBank, SlidersHorizontal, TrendingUp, Wallet } from 'lucide-react'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import LineChart, { LineSeries } from '@/components/ui/LineChart'
import DonutChart, { DonutSlice } from '@/components/ui/DonutChart'
import ExpandableDonut from '@/components/ui/ExpandableDonut'
import HBarChart, { HBarItem } from '@/components/ui/HBarChart'
import FilterSheet from '@/components/layout/FilterSheet'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import VintageCard from '@/components/ui/VintageCard'
import Select from '@/components/ui/Select'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
import Modal from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { buildDonutSlices } from '@/lib/donut'
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
import { formatMoney } from '@/lib/money'
import { buildBrandedPdfBlob, downloadBlob, downloadCsv, openHtmlAsPdf } from '@/lib/report-export'
import { resolveCategoryName } from '@/lib/categories'
import type { AppLocale } from '@/lib/i18n/getLocale'

type EmbeddedCategory = { name: string; name_en: string | null; name_es: string | null }
function rowCategoryLabel(
  row: { category_name: string | null; categories: EmbeddedCategory | EmbeddedCategory[] | null },
  locale: AppLocale
): string | null {
  const embedded = Array.isArray(row.categories) ? row.categories[0] : row.categories
  return embedded ? resolveCategoryName(embedded, locale) : row.category_name
}
import {
  formatLimitBadge,
  getUserBillingPeriodKey,
  limitBarColor,
  loadCategoryLimitsForMonth,
  toggleCategoryLimitSilence,
  type CategoryLimitRow,
} from '@/lib/categoryLimits'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'

interface Totals {
  income: number
  paid: number
  saved: number
  balance: number
}

type PieMetric = 'income' | 'paid' | 'saved'
type ChartMode = 'bars' | 'line'
type MetricKey = 'income' | 'paid' | 'saved' | 'balance'

interface CategorySlice {
  label: string
  value: number
  color: string
}

interface BarDetailRow {
  date: string
  created_at: string
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
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const { familyId, currency } = useAuth()
  const { tier } = usePlan()
  const isFreeTier = tier === 'free'
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [chartMode, setChartMode] = useState<ChartMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('dashboard-chart-view')
      if (stored === 'bars' || stored === 'line') return stored as ChartMode
    }
    return 'bars'
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
  const [limitRows, setLimitRows] = useState<CategoryLimitRow[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [billingPeriodKey, setBillingPeriodKey] = useState('')
  const [togglingBellId, setTogglingBellId] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [showPaywallModal, setShowPaywallModal] = useState(false)

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
    { key: 'income' as MetricKey, label: t('comparatives.kpiReceived'), value: totals.income, color: METRIC_COLORS.income },
    { key: 'paid' as MetricKey, label: t('comparatives.kpiPaid'), value: totals.paid, color: METRIC_COLORS.paid },
    { key: 'saved' as MetricKey, label: t('comparatives.kpiSaved'), value: totals.saved, color: METRIC_COLORS.saved },
    { key: 'balance' as MetricKey, label: t('comparatives.balance'), value: totals.balance, color: METRIC_COLORS.balance },
  ])

  const loadCategorySlices = async () => {
    let incomeQuery = supabase
      .from('incomes')
      .select('description,category_name,amount_cents,date,created_at,categories(name,name_en,name_es)')
      .eq('family_id', familyId!)
      .eq('status', 'received')

    let paidQuery = supabase
      .from('expenses')
      .select('description,category_name,amount_cents,date,payment_method,created_at,categories(name,name_en,name_es)')
      .eq('family_id', familyId!)
      .eq('status', 'paid')

    let dreamQuery = supabase
      .from('savings_contributions')
      .select('saving_id,amount_cents,date,type,created_at')
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

    const incomeDetails: BarDetailRow[] = []
    for (const row of incomeRows.data || []) {
      const detail = {
        date: row.date,
        created_at: row.created_at,
        name: row.description || t('comparatives.noName'),
        category: rowCategoryLabel(row, locale) || t('expenses.noCategory'),
        value: row.amount_cents,
      }
      if (!isDateWithinFilters(detail.date, selectedMonth, selectedYear)) continue
      if (!matchesSearch(searchTerm, detail.name, detail.category, formatMoney(detail.value, currency, locale))) continue
      incomeDetails.push(detail)
    }
    incomeDetails.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

    const paidDetails: BarDetailRow[] = []
    for (const row of paidRows.data || []) {
      const detail = {
        date: row.date,
        created_at: row.created_at,
        name: row.description || t('comparatives.noName'),
        category: rowCategoryLabel(row, locale) || t('expenses.noCategory'),
        value: row.amount_cents,
      }
      if (!isDateWithinFilters(detail.date, selectedMonth, selectedYear)) continue
      if (!matchesSearch(searchTerm, detail.name, detail.category, formatMoney(detail.value, currency, locale))) continue
      paidDetails.push(detail)
    }
    paidDetails.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

    const savedDetails: BarDetailRow[] = []
    for (const row of savingsRows.data || []) {
      if (row.type === 'withdrawal') continue
      const savingName = savingNameById.get(row.saving_id) || t('expenses.noCategory')
      const detail = {
        date: row.date,
        created_at: row.created_at,
        name: savingName,
        category: savingName,
        value: row.amount_cents,
      }
      if (!isDateWithinFilters(detail.date, selectedMonth, selectedYear)) continue
      if (!matchesSearch(searchTerm, detail.name, detail.category, formatMoney(detail.value, currency, locale))) continue
      savedDetails.push(detail)
    }
    savedDetails.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

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
      ...incomeDetails.map((row) => ({ ...row, source: t('comparatives.kpiReceived') })),
      ...paidDetails.map((row) => ({ ...row, value: -row.value, source: t('comparatives.kpiPaid') })),
      ...savedDetails.map((row) => ({ ...row, value: -row.value, source: t('comparatives.kpiSaved') })),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

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
    for (const row of paidRows.data || []) {
      if (!isDateWithinFilters(row.date, selectedMonth, selectedYear)) continue
      const method = row.payment_method || 'Outro'
      methodMap.set(method, (methodMap.get(method) || 0) + row.amount_cents)
    }
    const methodTotal = Array.from(methodMap.values()).reduce((s, v) => s + v, 0) || 1
    const METHOD_COLORS: Record<string, string> = {
      PIX: '#6FBF8A', Credito: '#2F6F7E', Debito: '#3689B5', ValeAlimentacao: '#16A34A',
      Dinheiro: '#3E5F4B', Cheque: '#7A66A1', Transferência: '#3E8E5C', Outro: '#C2A45D',
    }
    const allMethods = ['PIX', 'Credito', 'Debito', 'ValeAlimentacao', 'Dinheiro', 'Cheque', 'Transferência', 'Outro']
    const paymentItems: HBarItem[] = []
    for (const m of allMethods) {
      const val = methodMap.get(m) || 0
      if (val <= 0) continue
      const methodLabel = m === 'Credito' ? t('filterSheet.methodCredit')
        : m === 'Debito' ? t('filterSheet.methodDebit')
        : m === 'ValeAlimentacao' ? t('filterSheet.methodMealVoucher')
        : m === 'Dinheiro' ? t('filterSheet.methodCash')
        : m === 'Cheque' ? t('filterSheet.methodCheck')
        : m === 'Transferência' ? t('filterSheet.methodTransfer')
        : m === 'Outro' ? t('comparatives.methodOther')
        : m
      paymentItems.push({ label: methodLabel, value: val, pct: Math.round((val / methodTotal) * 100), color: METHOD_COLORS[m] })
    }
    setPaymentMethodItems(paymentItems)

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
          const label = `${getMonthLabel(month, locale).slice(0, 3)}/${String(year).slice(2)}`
          return { label, income, paid, saved }
        }),
      )
      if (!cancelled) setTrendData(results)
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, locale])

  useEffect(() => {
    if (!familyId) return
    const effectiveYear = selectedYear === ALL_YEARS_VALUE ? getCurrentYear() : selectedYear
    const effectiveMonth = selectedMonth === ALL_MONTHS_VALUE ? getCurrentMonth() : selectedMonth
    const loadWithSilences = async () => {
      const periodKey = billingPeriodKey || await getUserBillingPeriodKey()
      if (!billingPeriodKey) setBillingPeriodKey(periodKey)
      const rows = await loadCategoryLimitsForMonth(familyId, effectiveYear, effectiveMonth, periodKey)
      setLimitRows(rows)
    }
    loadWithSilences()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear])

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


  // Donut for expenses by category
  const expenseDonutSlices = useMemo((): DonutSlice[] => {
    return buildDonutSlices(categorySlices.paid, 8)
  }, [categorySlices.paid])

  // Trend series (multi-line)
  const trendSeries = useMemo((): LineSeries[] => {
    if (!trendData.length) return []
    return [
      { label: t('comparatives.kpiReceived'), data: trendData.map((d) => d.income / 100), color: '#6FBF8A' },
      { label: t('comparatives.kpiPaid'), data: trendData.map((d) => d.paid / 100), color: '#2F6F7E' },
      { label: t('comparatives.kpiSaved'), data: trendData.map((d) => d.saved / 100), color: '#3689B5' },
      { label: t('comparatives.balance'), data: trendData.map((d) => (d.income - d.paid - d.saved) / 100), color: '#C2A45D' },
    ]
  }, [trendData, t])

  // KPI delta: find prev month relative to the selected filter month
  const prevMonthTrendData = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE) return null
    const pm = selectedMonth === 1 ? 12 : selectedMonth - 1
    const effectiveYear = selectedYear || getCurrentYear()
    const py = selectedMonth === 1 ? effectiveYear - 1 : effectiveYear
    const expectedLabel = `${getMonthLabel(pm, locale).slice(0, 3)}/${String(py).slice(2)}`
    return trendData.find((d) => d.label === expectedLabel) ?? null
  }, [selectedMonth, selectedYear, trendData, locale])

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
      label: getMonthLabel(selectedMonth, locale),
      onRemove: () => setSelectedMonth(getCurrentMonth()),
      disabled: selectedMonth === getCurrentMonth(),
    },
    {
      key: 'year',
      label: getYearLabel(selectedYear, locale),
      onRemove: () => setSelectedYear(getCurrentYear()),
      disabled: selectedYear === getCurrentYear(),
    },
  ]

  // Flat rows: paid expenses + income + savings, each with type label
  const exportRows = [
    ...barDetails.paid.map((row) => [
      row.date ? formatDate(row.date) : '',
      row.name,
      row.category,
      t('comparatives.kpiPaid'),
      row.value,
    ]),
    ...barDetails.income.map((row) => [
      row.date ? formatDate(row.date) : '',
      row.name,
      row.category,
      t('comparatives.kpiReceived'),
      row.value,
    ]),
    ...barDetails.saved.map((row) => [
      row.date ? formatDate(row.date) : '',
      row.name,
      row.category,
      t('comparatives.kpiSaved'),
      row.value,
    ]),
  ]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map((r) => [r[0], r[1], r[2], r[3], formatMoney(Number(r[4]), currency, locale)])

  const exportSubtitle = [
    `${t('comparatives.period')}: ${selectedMonth === ALL_MONTHS_VALUE ? getMonthLabel(ALL_MONTHS_VALUE, locale).toLowerCase() : getMonthLabel(selectedMonth, locale)} / ${selectedYear === ALL_YEARS_VALUE ? getYearLabel(ALL_YEARS_VALUE, locale).toLowerCase() : getYearLabel(selectedYear, locale)}`,
    searchTerm ? `${t('common.search')}: ${searchTerm}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `comparativos-${format(new Date(), 'yyyy-MM-dd')}`,
    title: t('comparatives.title'),
    subtitle: exportSubtitle,
    headers: [
      t('comparatives.csvHeaderDate'),
      t('comparatives.csvHeaderDescription'),
      t('comparatives.csvHeaderCategory'),
      t('comparatives.csvHeaderType'),
      t('comparatives.csvHeaderAmount'),
    ],
    rows: exportRows,
  }

  const buildComparativesPdfBlob = () => buildBrandedPdfBlob({
    title: t('comparatives.title'),
    filterSummary: exportSubtitle || t('common.noActiveFilters'),
    headers: [
      t('comparatives.csvHeaderDate'),
      t('comparatives.csvHeaderDescription'),
      t('comparatives.csvHeaderCategory'),
      t('comparatives.csvHeaderType'),
      t('comparatives.csvHeaderAmount'),
    ],
    rows: exportRows,
    cards: [
      { label: t('comparatives.kpiReceived').toUpperCase(), value: formatMoney(monthlyTotals.income, currency, locale) },
      { label: t('comparatives.kpiPaid').toUpperCase(), value: formatMoney(monthlyTotals.paid, currency, locale) },
      { label: t('comparatives.kpiSaved').toUpperCase(), value: formatMoney(monthlyTotals.saved, currency, locale) },
      { label: t('comparatives.balance').toUpperCase(), value: formatMoney(monthlyTotals.balance, currency, locale) },
    ],
    generatedDate: formatDate(new Date()),
    accentColor: '#C2A45D',
    locale,
  })

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
      const blob = await buildComparativesPdfBlob()
      setPdfBlob(blob)
      setPdfUrl(URL.createObjectURL(blob))
    } finally {
      setPdfGenerating(false)
      setExportingFormat(null)
    }
  }

  const downloadPreviewPdf = async () => {
    const url = pdfUrl || URL.createObjectURL(await buildComparativesPdfBlob())
    openHtmlAsPdf(url)
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
      setShowPaywallModal(true)
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
        title={t('comparatives.title')}
        subtitle={t('comparatives.topbarSubtitle')}
        accent="#C2A45D"
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
                ? (selectedYear === ALL_YEARS_VALUE ? t('comparatives.allFilter') : getMonthLabel(ALL_MONTHS_VALUE, locale))
                : `${getMonthLabel(selectedMonth, locale).slice(0, 3)}${selectedYear === ALL_YEARS_VALUE ? ` • ${getYearLabel(ALL_YEARS_VALUE, locale)}` : ` ${selectedYear}`}`}
            </span>
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
            aria-label={t('common.moreOptions')}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-56 overflow-hidden animate-popup-in">
                <button
                  type="button"
                  onClick={() => { handleExportCsv(); setMobileMenuOpen(false) }}
                  disabled={exportingFormat !== null}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3 disabled:opacity-40"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('comparatives.exportCsv')}</p>
                    <p className="text-xs text-ink/45">{t('comparatives.exportCsvDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportPdf(); setMobileMenuOpen(false) }}
                  disabled={exportingFormat !== null}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage flex items-center gap-3 disabled:opacity-40"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('comparatives.exportPdf')}</p>
                    <p className="text-xs text-ink/45">{t('comparatives.exportPdfDesc')}</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop toolbar */}
        <div className="hidden md:flex items-center gap-2.5 px-6 py-3 border-b border-border bg-bg">
          <button
            type="button"
            onClick={() => setFiltersOpen(prev => !prev)}
            className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] border border-border bg-white text-ink text-[13px] font-medium hover:bg-paper transition-vintage"
          >
            <SlidersHorizontal className="w-4 h-4 text-petrol" />
            {selectedMonth === ALL_MONTHS_VALUE
              ? (selectedYear === ALL_YEARS_VALUE ? t('comparatives.last6Months') : String(selectedYear))
              : `${getMonthLabel(selectedMonth, locale).slice(0, 3)} ${selectedYear}`}
            <ChevronDown className={`w-3.5 h-3.5 text-ink/40 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1" />
          <button type="button" onClick={handleExportPdf} disabled={!trendData.length} className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] text-white text-[13px] font-semibold transition-vintage disabled:opacity-40" style={{ background: '#C2A45D' }}>
            <FileText className="w-4 h-4" /> {t('comparatives.exportPdf')}
          </button>
        </div>

        {/* Desktop filter panel */}
        {filtersOpen && (
          <div className="hidden md:flex items-center gap-3 px-6 py-2.5 border-b border-border bg-bg/60">
            <MonthYearPicker
              month={selectedMonth}
              year={selectedYear}
              onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
            />
            {activeFiltersCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-xs text-[#B05C3A] hover:underline">{t('common.clearFilters')}</button>
            )}
          </div>
        )}

        {/* Scrollable content area - mobile only internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible w-full flex flex-col md:px-6 md:pb-4 pt-10">
          <div className="hidden">
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
              <div className="text-center py-12 text-ink/60">{t('comparatives.loading')}</div>
            ) : (
              <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AnalyticsKpiCard
                  label={t('comparatives.kpiReceived')}
                  value={formatMoney(monthlyTotals.income, currency, locale)}
                  sub={incDelta ? `${incDelta.positive ? '↑' : '↓'} ${Math.abs(incDelta.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={incDelta?.positive}
                  subNegative={incDelta ? !incDelta.positive : false}
                  iconTheme="green"
                  icon={TrendingUp}
                />
                <AnalyticsKpiCard
                  label={t('comparatives.kpiPaid')}
                  value={formatMoney(monthlyTotals.paid, currency, locale)}
                  sub={paidDeltaComp ? `${paidDeltaComp.positive ? '↑' : '↓'} ${Math.abs(paidDeltaComp.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={paidDeltaComp?.positive}
                  subNegative={paidDeltaComp ? !paidDeltaComp.positive : false}
                  iconTheme="blue"
                  icon={CreditCard}
                />
                <AnalyticsKpiCard
                  label={t('comparatives.kpiSaved')}
                  value={formatMoney(monthlyTotals.saved, currency, locale)}
                  sub={savedDelta ? `${savedDelta.positive ? '↑' : '↓'} ${Math.abs(savedDelta.pct)}% vs ${prevMonthLabelComp}` : undefined}
                  subPositive={savedDelta?.positive}
                  subNegative={savedDelta ? !savedDelta.positive : false}
                  iconTheme="purple"
                  icon={PiggyBank}
                />
                <AnalyticsKpiCard
                  label={t('comparatives.balance')}
                  value={formatMoney(monthlyTotals.balance, currency, locale)}
                  iconTheme={balanceIsNeg ? 'red' : 'orange'}
                  icon={Wallet}
                />
              </div>

              {/* Main chart: Fluxo | Barras toggle */}
              <VintageCard className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-serif font-semibold text-coffee">{t('comparatives.cashFlow')}</h3>
                  <div className="flex gap-1 bg-bg border border-border rounded-lg p-0.5">
                    {(['bars', 'line'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartMode(mode)}
                        className={`px-3.5 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors ${
                          chartMode === mode ? 'bg-petrol text-white' : 'text-ink/50 hover:text-ink'
                        }`}
                      >
                        {mode === 'bars' ? t('comparatives.barsView') : t('comparatives.lineView')}
                      </button>
                    ))}
                  </div>
                </div>

                {(
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
                        const isNegativeSaldo = item.key === 'balance' && item.value < 0
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
                            <div className="mt-1 text-center text-xs font-light font-numbers text-ink/45">{formatMoney(item.value, currency, locale)}</div>
                          </div>
                        )
                      })}
                    </div>

                    {hoveredBar && (
                      <div className="absolute right-4 top-4 w-[340px] max-w-[calc(100%-2rem)] rounded-lg border border-border bg-paper p-3 shadow-soft z-20">
                        <div className="text-sm font-semibold text-coffee mb-2">
                          {t('comparatives.detailsFor', { label: monthlyItems.find((item) => item.key === hoveredBar)?.label ?? '' })}
                        </div>
                        {barDetails[hoveredBar].length === 0 ? (
                          <div className="text-xs text-ink/50 italic">{t('comparatives.emptyState')}</div>
                        ) : (
                          <div className="max-h-56 overflow-auto space-y-1.5 pr-1">
                            {barDetails[hoveredBar].map((row, index) => (
                              <div key={`${row.date}-${row.category}-${index}`} className="text-xs text-ink/75">
                                <span className="font-numbers">{formatDate(row.date)}</span>
                                <span> • </span><span>{row.name}</span>
                                <span> • </span><span>{row.category}</span>
                                {row.source && (<><span> • </span><span>{row.source}</span></>)}
                                <span> • </span>
                                <span className="font-numbers">{formatMoney(row.value, currency, locale)}</span>
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
                {/* Month summary */}
                <div className="bg-white rounded-xl border border-border shadow-soft p-4">
                  <h3 className="text-sm font-semibold text-ink font-serif mb-3">{t('comparatives.monthSummary')}</h3>
                  {[
                    { label: t('comparatives.totalReceived'), value: monthlyTotals.income, color: '#6FBF8A' },
                    { label: t('comparatives.totalPaid'), value: monthlyTotals.paid, color: '#2F6F7E' },
                    { label: t('comparatives.totalSaved'), value: monthlyTotals.saved, color: '#3689B5' },
                    { label: t('comparatives.balance'), value: monthlyTotals.balance, color: monthlyTotals.balance < 0 ? '#C06060' : '#C2A45D' },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-[7px] border-b border-border/40 last:border-0">
                      <span className="text-[12px] text-ink/70">{r.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: r.color }}>{formatMoney(r.value, currency, locale)}</span>
                    </div>
                  ))}
                </div>

                {/* Despesas por categoria */}
                {expenseDonutSlices.length > 0 ? (
                  <ExpandableDonut
                    slices={expenseDonutSlices}
                    total={monthlyTotals.paid}
                    title={t('comparatives.expensesByCategory')}
                    modalTitle={t('comparatives.expensesByCategory')}
                    currency={currency}
                    items={barDetails.paid.map((row, i) => ({
                      id: String(i),
                      description: row.name,
                      amount_cents: row.value,
                      date: row.date,
                      status: 'paid',
                      payment_method: null,
                      category_name: row.category,
                      category_id: null,
                    }))}
                    getCategoryLabel={(_id, name) => name}
                  />
                ) : (
                  <div className="bg-white rounded-xl border border-border shadow-soft p-4 text-sm text-ink/40 italic">{t('comparatives.noData')}</div>
                )}
              </div>

              {/* Trend chart */}
              <VintageCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-serif font-semibold text-coffee">{t('comparatives.monthlyEvolution')}</h3>
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
                  <div className="h-[130px] flex items-center justify-center text-sm text-ink/40">{t('comparatives.loading')}</div>
                )}
              </VintageCard>

              {/* Gasto vs. limite */}
              {limitRows.length > 0 && (
                <VintageCard>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-base font-serif font-semibold text-coffee">{t('comparatives.spendingVsLimit')}</h3>
                      <p className="text-xs text-ink/50 mt-0.5">{t('comparatives.familyMonthPosition')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-xs text-petrol hover:underline shrink-0 mt-1"
                    >
                      {t('comparatives.editLimits')}
                    </button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {limitRows.map((row) => {
                      const barColor = limitBarColor(row.status)
                      const badge = formatLimitBadge(row, t, currency, locale)
                      const handleBell = async () => {
                        if (!familyId || !billingPeriodKey) return
                        setTogglingBellId(row.categoryId)
                        const nowSilenced = await toggleCategoryLimitSilence(familyId, row.categoryId, billingPeriodKey)
                        setLimitRows(prev => prev.map(r => r.categoryId === row.categoryId ? { ...r, silenced: nowSilenced } : r))
                        setTogglingBellId(null)
                      }
                      return (
                        <div key={row.categoryId}>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                            <span className="text-sm font-medium text-ink/85 truncate">
                              {row.categoryName}
                              {row.parentName && <span className="text-ink/40 font-normal"> · {row.parentName}</span>}
                            </span>
                            <div className="flex-1" />
                            <span className="text-sm tabular-nums text-ink/60 shrink-0">{t('dashboard.spentOfLimit', { spent: formatMoney(row.spentCents, currency, locale), limit: formatMoney(row.limitCents, currency, locale) })}</span>
                            <span
                              className="text-xs font-semibold shrink-0 min-w-[3.5rem] text-right"
                              style={{ color: barColor }}
                            >
                              {badge}
                            </span>
                            <button
                              type="button"
                              onClick={handleBell}
                              disabled={togglingBellId === row.categoryId}
                              title={row.silenced ? t('comparatives.alertsSilencedTitle') : t('comparatives.silenceAlertsTitle')}
                              className={`shrink-0 p-1 rounded transition-colors ${row.silenced ? 'text-gold' : 'text-ink/25 hover:text-ink/50'}`}
                            >
                              {row.silenced ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-border/50 overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(row.pct, 100)}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </VintageCard>
              )}

            </div>
            )}
          </div>
        </div>

        {/* Mobile footer - sticky outside scroll */}
        <div className="md:hidden shrink-0 h-[44px] border-t border-border bg-offWhite flex items-center justify-center px-6">
          <p className="text-center text-[13px] text-gold italic">
            {t('comparatives.footerQuote')}
          </p>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="h-[76px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              {t('comparatives.footerQuote')}
            </p>
          </div>
        </footer>
      </div>

      <CategorySettingsModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        familyId={familyId}
        currency={currency}
        kind="expense"
        onChanged={() => {
          const effectiveYear = selectedYear === ALL_YEARS_VALUE ? getCurrentYear() : selectedYear
          const effectiveMonth = selectedMonth === ALL_MONTHS_VALUE ? getCurrentMonth() : selectedMonth
          loadCategoryLimitsForMonth(familyId!, effectiveYear, effectiveMonth, billingPeriodKey).then(setLimitRows)
        }}
      />

      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={closePdfModal}
        title={t('common.pdfPreviewTitle')}
        summary={exportSubtitle}
        pdfUrl={pdfUrl}
        isGenerating={pdfGenerating}
        onDownload={downloadPreviewPdf}
        downloadLabel={t('common.pdfDownloadLabel')}
        previewLabel={t('common.pdfPreviewTitle')}
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

      <Modal isOpen={showPaywallModal} onClose={() => setShowPaywallModal(false)} title={t('comparatives.paywallTitle')}>
        <div className="space-y-4">
          <p className="text-ink/80 text-sm">
            {t('comparatives.paywallBody')}
          </p>
          <p className="text-ink/60 text-sm">
            {t('comparatives.paywallPro')}
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowPaywallModal(false)} className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage text-sm">
              {t('common.close')}
            </button>
            <Link href="/settings/billing" className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg text-sm font-semibold text-center hover:bg-coffee/90 transition-vintage">
              {t('comparatives.paywallCta')}
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  )
}
