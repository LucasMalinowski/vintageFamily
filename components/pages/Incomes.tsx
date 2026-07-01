'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { triggerWidgetSync } from '@/lib/notifications/triggerWidgetSync'
import { useAuth } from '@/components/AuthProvider'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import LineChart, { LineSeries } from '@/components/ui/LineChart'
import DonutChart, { DonutSlice } from '@/components/ui/DonutChart'
import ExpandableDonut from '@/components/ui/ExpandableDonut'
import Topbar from '@/components/layout/Topbar'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import Select from '@/components/ui/Select'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import Modal from '@/components/ui/Modal'
import RightDrawer from '@/components/ui/RightDrawer'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { toast } from '@/components/ui/Toast'
import EmptyState from '@/components/ui/EmptyState'
import CategoryPathStack from '@/components/ui/CategoryPathStack'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { formatMoney } from '@/lib/money'
import {
  formatDate,
  formatMonthYear,
  getCurrentMonth,
  getCurrentYear,
  getMonthLabel,
  getMonthRange,
  getYearLabel,
  getYearRange,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { getBillingCycleRange, getCurrentBillingPeriod } from '@/lib/billing-cycle'
import { ArrowDown, Calendar, Check, ChevronDown, Clock, DollarSign, Download, Edit2, FileDown, FileText, List, SlidersHorizontal, Search, Plus, TrendingUp, Upload, X, Tag } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import FilterSheet from '@/components/layout/FilterSheet'
import { getAttachmentViewUrl, parseLegacyAttachment } from '@/lib/security/attachments'
import type { AppLocale } from '@/lib/i18n/getLocale'
import CategorySettingsModal from '@/components/categories/CategorySettingsModal'
import BankStatementImportModal from '@/components/bank-statements/BankStatementImportModal'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
import {
  buildCategoryIconMap,
  buildCategoryLabelMap,
  buildCategoryOptions,
  CategoryRecord,
  findCategoryIdByStoredName,
  getCategoryIdsWithDescendants,
} from '@/lib/categories'
import { matchesSearch } from '@/lib/filterSearch'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { buildBrandedPdfBlob, downloadBlob, downloadCsv, openHtmlAsPdf } from '@/lib/report-export'
import { usePlan } from '@/lib/billing/plan-context'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import { useTranslations, useLocale } from 'next-intl'

type IncomeStatus = 'received' | 'pending' | 'pending_confirmation'

interface Income {
  id: string
  description: string
  category_id: string | null
  category_name: string
  amount_cents: number
  date: string
  status: IncomeStatus
  notes: string | null
  attachment_path: string | null
  created_by: string | null
  created_at: string
  recurring_pattern_id: string | null
}

function isDateInBillingPeriod(date: string, month: number, year: number, cycleDay: number): boolean {
  if (month === ALL_MONTHS_VALUE || year === ALL_YEARS_VALUE) return true
  const refMonth = `${year}-${String(month).padStart(2, '0')}`
  const { start, end } = getBillingCycleRange(cycleDay, refMonth)
  return date >= start && date <= end
}

export default function Incomes() {
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const { familyId, user, currency } = useAuth()
  const { tier } = usePlan()
  const isFreeTier = tier === 'free'
  const [incomes, setIncomes] = useState<Income[]>([])
  const [rawYearIncomes, setRawYearIncomes] = useState<Income[]>([])
  const [trendData, setTrendData] = useState<{ label: string; value: number }[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycleDay, setBillingCycleDay] = useState(1)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'' | IncomeStatus>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [detailIncome, setDetailIncome] = useState<Income | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<Map<string, string>>(new Map())
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)
  const [showPaywallModal, setShowPaywallModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const RECURRENCE_OPTIONS = [
    { value: 'weekly', label: t('incomes.frequencyWeekly') },
    { value: 'biweekly', label: t('incomes.frequencyBiweekly') },
    { value: 'monthly', label: t('incomes.frequencyMonthly') },
    { value: 'bimonthly', label: t('incomes.frequencyBimonthly') },
    { value: 'quarterly', label: t('incomes.frequencyQuarterly') },
    { value: 'semiannual', label: t('incomes.frequencySemiannual') },
    { value: 'annual', label: t('incomes.frequencyAnnual') },
  ]

  const [formData, setFormData] = useState({
    description: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'received' as IncomeStatus,
    notes: '',
    isRecurring: false,
    recurrenceFrequency: 'monthly',
    isFixedAmount: true,
  })
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null)
  const currentCategoryIdRef = useRef(formData.categoryId)
  currentCategoryIdRef.current = formData.categoryId

  useEffect(() => {
    if (formData.categoryId) { setSuggestedCategoryId(null); return }
    const desc = formData.description.trim()
    if (desc.length < 2) { setSuggestedCategoryId(null); return }
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch('/api/suggest/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ description: desc, kind: 'income' }),
        })
        const data = await res.json()
        if (data.categoryId && !currentCategoryIdRef.current) setSuggestedCategoryId(data.categoryId)
      } catch { /* silent */ }
    }, 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.description])

  const loadCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('id,name,name_en,name_es,kind,parent_id,is_system,icon')
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

    query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(2000)

    if (selectedCategoryId) {
      query = query.in('category_id', getCategoryIdsWithDescendants(categories, selectedCategoryId))
    }

    if (selectedStatus) {
      query = query.eq('status', selectedStatus)
    }

    const { data } = await query

    if (data) {
      const normalized = data.map((row) => ({
        ...row,
        status: (row.status === 'pending' ? 'pending' : row.status === 'pending_confirmation' ? 'pending_confirmation' : 'received') as IncomeStatus,
        created_by: row.created_by ?? null,
      }))
      setRawYearIncomes(normalized)
      setIncomes(normalized.filter((income) => isDateInBillingPeriod(income.date, selectedMonth, selectedYear, billingCycleDay)))
    }
    setLoading(false)
  }, [familyId, categories, selectedMonth, selectedYear, selectedCategoryId, selectedStatus, billingCycleDay])

  useEffect(() => {
    if (familyId) {
      loadCategories()
    }
  }, [familyId, loadCategories])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('users')
      .select('billing_cycle_day')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.billing_cycle_day) {
          setBillingCycleDay(data.billing_cycle_day)
          const period = getCurrentBillingPeriod(data.billing_cycle_day)
          const [py, pm] = period.split('-').map(Number)
          setSelectedYear(py)
          setSelectedMonth(pm)
        }
      })
  }, [user?.id])

  useEffect(() => {
    if (!familyId) return
    supabase
      .from('users')
      .select('id,name')
      .eq('family_id', familyId)
      .then(({ data }) => {
        if (data) setFamilyMembers(new Map(data.map((u) => [u.id, u.name])))
      })
  }, [familyId])

  useEffect(() => {
    if (familyId) {
      loadIncomes()
    }
  }, [familyId, loadIncomes])

  const categoryById = useMemo(
    () => new Map<string, CategoryRecord>(categories.map((category) => [category.id, category])),
    [categories]
  )
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories, locale), [categories, locale])
  const categoryIconMap = useMemo(() => buildCategoryIconMap(categories), [categories])
  const categoryOptions = useMemo(() => buildCategoryOptions(categories, locale), [categories, locale])

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

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    ;(async () => {
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
        return { year: d.getFullYear(), month: d.getMonth() + 1 }
      })
      const results = await Promise.all(
        months.map(async ({ year, month }) => {
          const { start, end } = getMonthRange(month, year)
          const { data } = await supabase
            .from('incomes')
            .select('amount_cents')
            .eq('family_id', familyId)
            .gte('date', format(start, 'yyyy-MM-dd'))
            .lte('date', format(end, 'yyyy-MM-dd'))
          const total = (data || []).reduce((s: number, r: { amount_cents: number }) => s + r.amount_cents, 0)
          const label = `${getMonthLabel(month, locale).slice(0, 3)}/${String(year).slice(2)}`
          return { label, value: total }
        }),
      )
      if (!cancelled) setTrendData(results)
    })()
    return () => { cancelled = true }
  }, [familyId, locale])

  const getCategoryLabel = (categoryId: string | null, fallbackName: string) => {
    if (categoryId) {
      return categoryLabelMap.get(categoryId) || fallbackName
    }
    return fallbackName
  }

  const getIncomeStatusLabel = (status: IncomeStatus) =>
    status === 'received' ? t('incomes.statusReceived')
      : status === 'pending_confirmation' ? t('incomes.statusPendingConfirmationShort')
      : t('incomes.statusPending')

  const handleToggleReceived = async (income: Income) => {
    if (updatingIds.includes(income.id)) return
    const nextStatus: IncomeStatus = income.status === 'received' ? 'pending' : 'received'
    // Optimistic update
    const applyUpdate = (arr: Income[]) =>
      arr.map((i) => i.id === income.id ? { ...i, status: nextStatus } : i)
    setIncomes(applyUpdate)
    setRawYearIncomes(applyUpdate)
    setUpdatingIds((prev) => [...prev, income.id])
    await supabase.from('incomes').update({ status: nextStatus }).eq('id', income.id)
    setUpdatingIds((prev) => prev.filter((id) => id !== income.id))
    triggerWidgetSync()
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
      setFormError(t('common.invalidCategoryError'))
      return
    }
    setFormError(null)

    const incomeData = {
      family_id: familyId!,
      description: formData.description,
      category_id: category.id,
      category_name: categoryLabel,
      amount_cents: amountCents,
      date: formData.date,
      status,
      notes: formData.notes || null,
      attachment_path: editingIncome?.attachment_path ?? currentAttachmentUrl,
    }

    if (editingIncome) {
      await supabase
        .from('incomes')
        .update({ ...incomeData, updated_at: new Date().toISOString() })
        .eq('id', editingIncome.id)
      // Optimistic: update only this record in state
      const updated = { ...editingIncome, ...incomeData } as Income
      setIncomes((prev) => prev.map((i) => i.id === editingIncome.id ? updated : i))
      setRawYearIncomes((prev) => prev.map((i) => i.id === editingIncome.id ? updated : i))
      closeModal()
      triggerWidgetSync()
      return
    } else {
      const { data: newRow } = await supabase.from('incomes').insert({ ...incomeData, created_by: user?.id ?? null }).select().maybeSingle()
      if (newRow) {
        setIncomes((prev) => [newRow as Income, ...prev])
        setRawYearIncomes((prev) => [newRow as Income, ...prev])
        if (incomes.length === 0) posthog.capture(EVENTS.FIRST_INCOME_CREATED)
        closeModal()
        triggerWidgetSync()
        return
      }
    }

    if (!editingIncome && incomes.length === 0) posthog.capture(EVENTS.FIRST_INCOME_CREATED)

    if (formData.isRecurring && !editingIncome) {
      const dateObj = new Date(formData.date)
      const freq = formData.recurrenceFrequency
      const freqDays: Record<string, number> = { weekly:7,biweekly:14,monthly:30,bimonthly:60,quarterly:91,semiannual:182,annual:365 }
      const nextDate = new Date(dateObj)
      nextDate.setDate(nextDate.getDate() + (freqDays[freq] ?? 30))
      const toISO = (d: Date) => d.toISOString().slice(0, 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('recurring_patterns').upsert(
        {
          family_id: familyId!,
          description_pattern: formData.description.toLowerCase().trim(),
          kind: 'income',
          category_id: category.id,
          estimated_amount_cents: formData.isFixedAmount ? amountCents : 0,
          amount_is_fixed: formData.isFixedAmount,
          frequency: freq,
          source: 'user',
          day_of_month: Math.min(dateObj.getDate(), 28),
          last_occurrence_date: formData.date,
          next_expected_date: toISO(nextDate),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,description_pattern,kind' }
      )
    }

    closeModal()
    loadIncomes()
    triggerWidgetSync()
  }

  const handleDelete = (id: string) => { setDeleteConfirmId(id) }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    setDeleting(true)
    await supabase.from('incomes').delete().eq('id', deleteConfirmId)
    setIncomes((prev) => prev.filter((i) => i.id !== deleteConfirmId))
    setRawYearIncomes((prev) => prev.filter((i) => i.id !== deleteConfirmId))
    setDeleting(false)
    setDeleteConfirmId(null)
    triggerWidgetSync()
  }

  const handleRejectRecurring = (id: string) => {
    if (updatingIds.includes(id)) return
    setRejectConfirmId(id)
  }

  const confirmReject = async () => {
    if (!rejectConfirmId) return
    const income = incomes.find((i) => i.id === rejectConfirmId) ?? rawYearIncomes.find((i) => i.id === rejectConfirmId)
    setRejecting(true)
    setUpdatingIds((prev) => [...prev, rejectConfirmId])
    if (income?.recurring_pattern_id) {
      await supabase
        .from('recurring_patterns')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', income.recurring_pattern_id)
    }
    await supabase.from('incomes').delete().eq('id', rejectConfirmId)
    setUpdatingIds((prev) => prev.filter((item) => item !== rejectConfirmId))
    setIncomes((prev) => prev.filter((i) => i.id !== rejectConfirmId))
    setRawYearIncomes((prev) => prev.filter((i) => i.id !== rejectConfirmId))
    setRejecting(false)
    setRejectConfirmId(null)
    triggerWidgetSync()
  }

  const openDetails = (income: Income) => {
    openModal(income)
  }

  const handleAttachIncome = async (income: Income, file: File) => {
    if (!familyId) return

    const form = new FormData()
    form.append('file', file)
    form.append('recordType', 'income')
    form.append('recordId', income.id)

    const { data: sessionData } = await supabase.auth.getSession()
    const response = await fetch('/api/attachments/upload', {
      method: 'POST',
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : undefined,
      body: form,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      toast(body?.error ?? t('incomes.attachmentUploadError'), { type: 'error' })
      return
    }

    loadIncomes()
  }

  const openModal = (income?: Income) => {
    if (income) {
      const { cleanNotes } = parseLegacyAttachment(income.notes)
      setEditingIncome(income)
      setCurrentAttachmentUrl(income.attachment_path ?? null)
      setFormData({
        description: income.description,
        categoryId: income.category_id || findCategoryIdByStoredName(categories, income.category_name) || '',
        amount: (income.amount_cents / 100).toFixed(2),
        date: income.date,
        status: income.status,
        notes: cleanNotes || '',
        isRecurring: false,
        recurrenceFrequency: 'monthly',
        isFixedAmount: true,
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
        isRecurring: false,
        recurrenceFrequency: 'monthly',
        isFixedAmount: true,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
    setCurrentAttachmentUrl(null)
    setFormError(null)
  }

  const filteredIncomes = incomes.filter((income) =>
    matchesSearch(
      searchTerm,
      income.description,
      getCategoryLabel(income.category_id, income.category_name),
      formatMoney(income.amount_cents, currency, locale)
    )
  )
  const groupedIncomes = filteredIncomes
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .reduce<Array<{ label: string; items: Income[] }>>((groups, income) => {
      const label = formatMonthYear(income.date, locale)
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(income)
        return groups
      }
      groups.push({ label, items: [income] })
      return groups
    }, [])
  const total = filteredIncomes.reduce((sum, inc) => sum + inc.amount_cents, 0)
  const pending = filteredIncomes
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount_cents, 0)

  const dailyAverageInc = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedYear === ALL_YEARS_VALUE) return 0
    const days = new Date(selectedYear, selectedMonth, 0).getDate()
    return days > 0 ? Math.round(total / days) : 0
  }, [total, selectedMonth, selectedYear])

  const prevMonthTotalInc = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedMonth === 1 || selectedYear === ALL_YEARS_VALUE) return null
    const prevM = selectedMonth - 1
    return rawYearIncomes
      .filter((i) => {
        const d = new Date(i.date)
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === prevM
      })
      .reduce((s, i) => s + i.amount_cents, 0)
  }, [rawYearIncomes, selectedMonth, selectedYear])

  const prevMonthLabelInc = useMemo(() => {
    if (selectedMonth === ALL_MONTHS_VALUE || selectedMonth === 1) return null
    return `${getMonthLabel(selectedMonth - 1, locale).slice(0, 3)}/${selectedYear}`
  }, [selectedMonth, selectedYear, locale])

  const totalDeltaPctInc = prevMonthTotalInc != null && prevMonthTotalInc > 0
    ? Math.round(((total - prevMonthTotalInc) / prevMonthTotalInc) * 100)
    : null

  const INC_CAT_PALETTE = [
    '#3E5F4B', '#6FBF8A', '#2F6F7E', '#4D9E6A', '#7A66A1',
    '#C2A45D', '#5E8E62', '#3689B5', '#5578A2', '#8A6B8F',
  ]

  const categoryDonutSlices = useMemo((): DonutSlice[] => {
    const map = new Map<string, number>()
    filteredIncomes.forEach((i) => {
      const label = getCategoryLabel(i.category_id, i.category_name)
      map.set(label, (map.get(label) || 0) + i.amount_cents)
    })
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const t = sorted.reduce((s, [, v]) => s + v, 0) || 1
    return sorted.map(([label, value], i) => ({
      label,
      value,
      pct: Math.round((value / t) * 100),
      color: INC_CAT_PALETTE[i % INC_CAT_PALETTE.length],
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredIncomes])

  const trendSeries = useMemo((): LineSeries[] => {
    if (!trendData.length) return []
    return [{ label: t('comparatives.incomes'), data: trendData.map((d) => d.value / 100), color: '#6FBF8A' }]
  }, [trendData, t])

  const monthLabelInc = selectedMonth !== ALL_MONTHS_VALUE ? getMonthLabel(selectedMonth, locale) : getMonthLabel(ALL_MONTHS_VALUE, locale)

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
      income.notes || '',
      formatMoney(income.amount_cents, currency, locale),
    ]),
  )

  const exportSubtitle = [
    `${t('expenses.periodLabel')}: ${selectedMonth === ALL_MONTHS_VALUE ? getMonthLabel(ALL_MONTHS_VALUE, locale).toLowerCase() : getMonthLabel(selectedMonth, locale)} / ${selectedYear === ALL_YEARS_VALUE ? getYearLabel(ALL_YEARS_VALUE, locale).toLowerCase() : getYearLabel(selectedYear, locale)}`,
    selectedCategoryId ? `${t('incomes.category')}: ${getCategoryLabel(selectedCategoryId, t('incomes.category'))}` : null,
    selectedStatus ? `${t('incomes.status')}: ${getIncomeStatusLabel(selectedStatus as IncomeStatus)}` : null,
    searchTerm ? `${t('common.search')}: ${searchTerm}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `receitas-${format(new Date(), 'yyyy-MM-dd')}`,
    title: t('incomes.exportTitle'),
    subtitle: exportSubtitle,
    headers: [t('incomes.csvHeaderDate'), t('incomes.csvHeaderDescription'), t('incomes.csvHeaderCategory'), t('incomes.csvHeaderStatus'), t('incomes.csvHeaderAmount'), t('incomes.csvHeaderNotes')],
    rows: exportRows,
  }

  const buildIncomePdfBlob = () => {
    const receivedCents = filteredIncomes
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    return buildBrandedPdfBlob({
      title: t('incomes.exportTitle'),
      filterSummary: exportSubtitle || t('common.noActiveFilters'),
      headers: [t('incomes.csvHeaderDate'), t('incomes.csvHeaderDescriptionPdf'), t('incomes.csvHeaderCategory'), t('incomes.csvHeaderStatus'), t('incomes.csvHeaderNotesPdf'), t('incomes.csvHeaderAmount')],
      rows: exportRows,
      cards: [
        { label: t('incomes.pdfTotal'), value: formatMoney(total, currency, locale) },
        { label: t('incomes.pdfReceived'), value: formatMoney(receivedCents, currency, locale) },
        { label: t('incomes.pdfReceivable'), value: formatMoney(total - receivedCents, currency, locale) },
      ],
      generatedDate: formatDate(new Date()),
      accentColor: '#3E8E5C',
      locale,
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
      setPdfError(t('incomes.pdfPreviewError'))
    } finally {
      setPdfGenerating(false)
      setExportingFormat(null)
    }
  }

  const downloadPreviewPdf = async () => {
    try {
      const url = pdfUrl || URL.createObjectURL(await buildIncomePdfBlob())
      openHtmlAsPdf(url)
    } catch {
      setPdfError(t('incomes.pdfOpenError'))
    }
  }

  const totalLabel = selectedStatus === 'pending'
    ? t('incomes.totalReceivable')
    : selectedStatus === 'received'
      ? t('incomes.totalReceived')
      : t('incomes.totalForPeriod')

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
    <>
      <div className="flex flex-col h-full md:min-h-screen">
        <Topbar
          title={t('incomes.title')}
          subtitle={t('incomes.topbarSubtitle')}
          accent="#3E8E5C"
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
                ? (selectedYear === ALL_YEARS_VALUE ? t('filterSheet.allOption') : getMonthLabel(ALL_MONTHS_VALUE, locale))
                : `${getMonthLabel(selectedMonth, locale).slice(0, 3)}${selectedYear === ALL_YEARS_VALUE ? ` • ${getYearLabel(ALL_YEARS_VALUE, locale)}` : ` ${selectedYear}`}`}
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
                  placeholder={t('common.searchPlaceholder')}
                  autoFocus
                  aria-label={t('incomes.searchAria')}
                  className="h-[38px] w-full rounded-[10px] border border-border bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-petrol/30"
                />
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchExpanded(false); setSearchTerm('') }}
                className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
                aria-label={t('common.closeSearch')}
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
                <span>{t('incomes.manageCategories')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileSearchExpanded(true)}
                className="w-[38px] h-[38px] rounded-[10px] border border-border bg-bg text-ink/60 flex items-center justify-center shrink-0"
                aria-label={t('common.search')}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAddMenuOpen((prev) => !prev)}
            className="w-[38px] h-[38px] rounded-[10px] bg-coffee text-paper flex items-center justify-center shrink-0"
            aria-label={t('common.add')}
          >
            <Plus className="w-5 h-5" />
          </button>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-64 overflow-hidden animate-popup-in">
                <button
                  type="button"
                  onClick={() => { openModal(); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <Edit2 className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('incomes.addManually')}</p>
                    <p className="text-xs text-ink/45">{t('incomes.addManuallyDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsImportModalOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('incomes.importBank')}</p>
                    <p className="text-xs text-ink/45">{t('incomes.importBankDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCategorySettingsOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('incomes.manageCategories')}</p>
                    <p className="text-xs text-ink/45">{t('incomes.manageCategoriesDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportCsv(); setAddMenuOpen(false) }}
                  disabled={!filteredIncomes.length || exportingFormat !== null}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3 disabled:opacity-40"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('incomes.exportCsv')}</p>
                    <p className="text-xs text-ink/45">{t('incomes.exportCsvDesc')}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportPdf(); setAddMenuOpen(false) }}
                  disabled={!filteredIncomes.length || exportingFormat !== null}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage flex items-center gap-3 disabled:opacity-40"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{t('incomes.exportPdf')}</p>
                    <p className="text-xs text-ink/45">{t('incomes.exportPdfDesc')}</p>
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
              ? (selectedYear === ALL_YEARS_VALUE ? t('filterSheet.allOption') : String(selectedYear))
              : `${getMonthLabel(selectedMonth, locale).slice(0, 3)} ${selectedYear !== ALL_YEARS_VALUE ? selectedYear : ''}`}
            <ChevronDown className={`w-3.5 h-3.5 text-ink/40 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center h-[38px] bg-white border border-border rounded-[10px] px-3 gap-2 flex-1 max-w-[380px]">
            <Search className="w-4 h-4 text-petrol shrink-0" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('incomes.search')} aria-label={t('incomes.searchFilterAria')} className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink/40 outline-none" />
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => setIsCategorySettingsOpen(true)} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage">
            <Tag className="w-4 h-4" /> {t('incomes.manageCategories')}
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!filteredIncomes.length || exportingFormat !== null} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage disabled:opacity-40">
            <Upload className="w-4 h-4" /> {t('incomes.exportPdf')}
          </button>
          <button type="button" onClick={() => openModal()} className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] text-white text-[13px] font-semibold transition-vintage" style={{ background: '#3E8E5C' }}>
            <Plus className="w-4 h-4" /> {t('incomes.addIncome')}
          </button>

          {/* Kept for compat but hidden */}
          <div className="hidden">
          <div className="relative">
          <div className="">
                  <button
                    type="button"
                    onClick={() => setAddMenuOpen((prev) => !prev)}
                    className="w-[38px] h-[38px] rounded-[10px] bg-coffee text-paper flex items-center justify-center"
                    aria-label={t('common.add')}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  {addMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-64 overflow-hidden animate-popup-in">
                        <button
                          type="button"
                          onClick={() => { openModal(); setAddMenuOpen(false) }}
                          className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                            <Edit2 className="w-4 h-4 text-ink/60" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{t('incomes.addManually')}</p>
                            <p className="text-xs text-ink/45">{t('incomes.addManuallyDesc')}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsImportModalOpen(true); setAddMenuOpen(false) }}
                          className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4 text-ink/60" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{t('incomes.importBank')}</p>
                            <p className="text-xs text-ink/45">{t('incomes.importBankDesc')}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExportCsv(); setAddMenuOpen(false) }}
                          disabled={!filteredIncomes.length || exportingFormat !== null}
                          className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3 disabled:opacity-40"
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                            <FileDown className="w-4 h-4 text-ink/60" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{t('incomes.exportCsv')}</p>
                            <p className="text-xs text-ink/45">{t('incomes.exportCsvDesc')}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleExportPdf(); setAddMenuOpen(false) }}
                          disabled={!filteredIncomes.length || exportingFormat !== null}
                          className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage flex items-center gap-3 disabled:opacity-40"
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-ink/60" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{t('incomes.exportPdf')}</p>
                            <p className="text-xs text-ink/45">{t('incomes.exportPdfDesc')}</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
          </div>
          </div>
          </div>

        {/* Desktop filter panel — outside scroll so dropdowns don't clip */}
        {filtersOpen && (
          <div className="hidden md:block bg-bg/60 border-b border-border">
            <div className="px-6 py-3 flex flex-wrap gap-3 items-end">
              <MonthYearPicker
                month={selectedMonth}
                year={selectedYear}
                onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y) }}
              />
              <div className="min-w-[160px] max-w-[260px]">
                <Select
                  variant="filter"
                  label={t('incomes.category')}
                  value={selectedCategoryId}
                  onChange={setSelectedCategoryId}
                  options={[{ value: '', label: 'Todas' }, ...categoryOptions]}
                />
              </div>
              <div className="min-w-[140px]">
                <Select
                  variant="filter"
                  label={t('incomes.status')}
                  value={selectedStatus}
                  onChange={(v) => setSelectedStatus(v as '' | IncomeStatus)}
                  options={[{ value: '', label: t('filterSheet.allOption') }, { value: 'received', label: t('incomes.statusReceived') }, { value: 'pending', label: t('incomes.statusPending') }]}
                />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" onClick={clearFilters} className="text-xs text-[#B05C3A] hover:underline self-end pb-2">{t('common.clearFilters')}</button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable cards area - mobile only internal scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible">
          <div className="w-full flex flex-col pt-3 pb-4 md:px-6 md:pt-4 md:pb-4">
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
              <Select
                variant="filter"
                label={t('incomes.category')}
                value={selectedCategoryId}
                onChange={setSelectedCategoryId}
                options={[
                  { value: '', label: 'Todas' },
                  ...categoryOptions,
                ]}
              />
              <Select
                variant="filter"
                label={t('incomes.status')}
                value={selectedStatus}
                onChange={(v) => setSelectedStatus((v as IncomeStatus) || '')}
                options={[
                  { value: '', label: t('filterSheet.allOption') },
                  { value: 'received', label: t('incomes.statusReceived') },
                  { value: 'pending', label: t('incomes.statusPending') },
                ]}
              />
              </FilterSidebar>
            </div>

            <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-0 md:pt-0 md:pb-0">
              {/* ── Analytics section ── */}
              {!loading && filteredIncomes.length > 0 && (
                <div className="space-y-4 mb-5">
                  {/* KPI row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <AnalyticsKpiCard
                      label={t('incomes.kpiTotal')}
                      value={formatMoney(total, currency, locale)}
                      sub={totalDeltaPctInc != null ? `${totalDeltaPctInc >= 0 ? '↑' : '↓'} ${Math.abs(totalDeltaPctInc)}% vs ${prevMonthLabelInc}` : undefined}
                      subPositive={totalDeltaPctInc != null && totalDeltaPctInc > 0}
                      subNegative={totalDeltaPctInc != null && totalDeltaPctInc < 0}
                      iconTheme="green"
                      icon={TrendingUp}
                    />
                    <AnalyticsKpiCard
                      label={t('incomes.kpiCount')}
                      value={String(filteredIncomes.length)}
                      sub={`${filteredIncomes.length === 1 ? 'registro' : 'registros'} em ${monthLabelInc}`}
                      iconTheme="blue"
                      icon={List}
                    />
                    <AnalyticsKpiCard
                      label={t('incomes.trend')}
                      value={formatMoney(dailyAverageInc, currency, locale)}
                      sub={selectedMonth !== ALL_MONTHS_VALUE ? `em ${monthLabelInc}` : undefined}
                      iconTheme="purple"
                      icon={Calendar}
                    />
                    <AnalyticsKpiCard
                      label={t('incomes.kpiPending')}
                      value={formatMoney(pending, currency, locale)}
                      sub={pending > 0 ? t('incomes.pendingCountSuffix', { count: filteredIncomes.filter(i => i.status === 'pending').length }) : t('incomes.allReceived')}
                      iconTheme="orange"
                      icon={Clock}
                    />
                  </div>

                  {/* Line + Donut charts */}
                  <div className="grid md:grid-cols-[1fr_280px] gap-4">
                    <div className="bg-white rounded-xl border border-border shadow-soft p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-ink font-serif">{t('incomes.trendTitle')}</h3>
                        <span className="text-[11px] text-ink/45">{t('incomes.last6Months')}</span>
                      </div>
                      {trendSeries.length > 0 ? (
                        <LineChart series={trendSeries} labels={trendData.map(d => d.label)} height={160} />
                      ) : (
                        <div className="h-[140px] flex items-center justify-center text-sm text-ink/40">{t('common.loading')}</div>
                      )}
                    </div>
                    {categoryDonutSlices.length > 0 ? (
                      <ExpandableDonut
                        slices={categoryDonutSlices}
                        total={total}
                        title={t('incomes.byCategory')}
                        modalTitle={t('incomes.byCategory')}
                        currency={currency}
                        items={filteredIncomes.map(i => ({
                          id: i.id,
                          description: i.description,
                          amount_cents: i.amount_cents,
                          date: i.date,
                          status: i.status === 'received' ? t('incomes.statusReceived') : t('incomes.statusPending'),
                          payment_method: null,
                          category_name: i.category_name,
                          category_id: i.category_id,
                        }))}
                        getCategoryLabel={getCategoryLabel}
                        getCatRailColor={(label) => {
                          const root = label.split(' / ')[0].split(' > ')[0].trim()
                          if (/sal.rio|renda/i.test(root)) return '#3E8E5C'
                          if (/aluguel/i.test(root)) return '#3F6E7A'
                          if (/extra|freelance|b.nus|bonus/i.test(root)) return '#C2A45D'
                          return '#6FBF8A'
                        }}
                      />
                    ) : (
                      <div className="text-sm text-ink/40 italic p-2">{t('incomes.noData')}</div>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-12 text-ink/60">{t('common.loading')}</div>
            ) : filteredIncomes.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-16 h-16" />}
                message={t('incomes.emptyState')}
                submessage={t('incomes.emptyStateFiltered')}
              />
            ) : (
              <div className="space-y-5">
                {filteredIncomes.some(i => i.status === 'pending_confirmation') && (() => {
                  const count = filteredIncomes.filter(i => i.status === 'pending_confirmation').length
                  return (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: 'rgba(47,111,126,0.06)', borderColor: 'rgba(47,111,126,0.2)' }}>
                      <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(47,111,126,0.12)', color: '#2F6F7E' }}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold" style={{ color: '#2F6F7E' }}>
                          {count === 1 ? t('incomes.recurringToConfirmOne') : t('incomes.recurringToConfirmMany', { count })}
                        </p>
                        <p className="text-xs text-ink/55 mt-0.5">
                          {t('incomes.recurringToConfirmDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedStatus('pending_confirmation')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-vintage"
                        style={{ borderColor: 'rgba(47,111,126,0.3)', color: '#2F6F7E', background: '#fff' }}
                      >
                        {t('incomes.reviewButton')} →
                      </button>
                    </div>
                  )
                })()}
                {groupedIncomes.map((group) => (
                  <div key={group.label} className="space-y-3">
                    {groupedIncomes.length > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1" style={{ background: 'rgba(62,142,92,0.22)' }} />
                        <span
                          className="rounded-full border px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em]"
                          style={{
                            borderColor: 'rgba(62,142,92,0.3)',
                            background: 'rgba(62,142,92,0.06)',
                            color: '#3E8E5C',
                          }}
                        >
                          {group.label}
                        </span>
                        <div className="h-px flex-1" style={{ background: 'rgba(62,142,92,0.22)' }} />
                      </div>
                    )}
                    <div className="space-y-3">
                      {group.items.map((income) => {
                        const isUpdating = updatingIds.includes(income.id)
                        const catLabel = getCategoryLabel(income.category_id, income.category_name)
                        const catParts = catLabel ? catLabel.split(' / ') : []
                        const catIcon = income.category_id ? categoryIconMap.get(income.category_id) : null
                        const isReceived = income.status === 'received'
                        const isPending = income.status === 'pending_confirmation'
                        return (
                          <div
                            key={income.id}
                            className={`transition-vintage ${isUpdating ? 'opacity-60' : ''}`}
                          >
                            {/* ── MOBILE card ── */}
                            <div className={`md:hidden rounded-xl overflow-hidden border shadow-sm flex ${isPending ? 'border-petrol/40 bg-petrol/5' : 'border-border bg-offWhite'}`}>
                              <div className={`w-[3px] shrink-0 ${isReceived ? 'bg-olive' : isPending ? 'bg-petrol' : 'bg-amber-400'}`} />
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
                                    aria-label={t(isReceived ? 'incomes.markAsPendingAria' : 'incomes.markAsReceivedAria', { description: income.description })}
                                  >
                                    {isReceived && <Check className="h-3 w-3 text-white" />}
                                  </button>
                                  {catIcon && <CategoryIcon name={catIcon} className="w-4 h-4 shrink-0 text-ink/40" />}
                                  <h4 className={`flex-1 min-w-0 text-base font-medium font-serif truncate ${isReceived ? 'text-sidebar/50' : 'text-sidebar'}`}>
                                    {income.description}
                                  </h4>
                                  <ActionMenu
                                    onView={() => openDetails(income)}
                                    onEdit={() => openModal(income)}
                                    onDelete={() => handleDelete(income.id)}
                                    onAttach={(file) => handleAttachIncome(income, file)}
                                    onToggleStatus={() => handleToggleReceived(income)}
                                    toggleStatusLabel={isReceived ? t('incomes.markAsPending') : t('incomes.markAsReceived')}
                                    onReject={isPending ? () => handleRejectRecurring(income.id) : undefined}
                                    rejectLabel={isPending ? t('incomes.rejectRecurringButton') : undefined}
                                    disabled={isUpdating}
                                  />
                                </div>

                                {/* Row 2: status badge + date */}
                                <div className="flex items-center justify-between">
                                  {isReceived ? (
                                    <span className="rounded-full bg-olive/15 px-2.5 py-0.5 text-[11px] font-semibold text-olive">{t('incomes.statusReceived')}</span>
                                  ) : isPending ? (
                                    <span className="rounded-full bg-petrol/10 border border-petrol/30 px-2.5 py-0.5 text-[11px] font-semibold text-petrol">{t('incomes.statusPendingConfirmation')}</span>
                                  ) : (
                                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">{t('incomes.statusPending')}</span>
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
                                    {formatMoney(income.amount_cents, currency, locale)}
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
                            <div className="hidden md:flex items-start gap-3 p-4 bg-offWhite rounded-lg border border-border hover:shadow-soft transition-vintage cursor-pointer" onClick={() => openModal(income)}>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleToggleReceived(income) }}
                                disabled={isUpdating}
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-vintage disabled:opacity-50 ${
                                  isReceived ? 'border-olive bg-olive' : 'border-amber-400 bg-transparent hover:border-olive'
                                }`}
                                aria-label={t(isReceived ? 'incomes.markAsPendingAria' : 'incomes.markAsReceivedAria', { description: income.description })}
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
                                        {t('incomes.statusReceived')}
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="rounded-full bg-petrol/10 border border-petrol/30 px-2.5 py-0.5 text-[11px] font-semibold text-petrol">
                                        {t('incomes.statusPendingConfirmation')}
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
                                    {formatMoney(income.amount_cents, currency, locale)}
                                  </span>
                                  <div onClick={e => e.stopPropagation()}>
                                    <ActionMenu
                                      onView={() => openDetails(income)}
                                      onEdit={() => openModal(income)}
                                      onDelete={() => handleDelete(income.id)}
                                      onAttach={(file) => handleAttachIncome(income, file)}
                                      onToggleStatus={() => handleToggleReceived(income)}
                                      toggleStatusLabel={isReceived ? t('incomes.markAsPending') : t('incomes.markAsReceived')}
                                      onReject={isPending ? () => handleRejectRecurring(income.id) : undefined}
                                      rejectLabel={isPending ? t('incomes.rejectRecurringButton') : undefined}
                                      disabled={isUpdating}
                                    />
                                  </div>
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

        {/* Mobile footer - sticky outside scroll */}
        <div className="md:hidden shrink-0 px-[18px] pt-3 pb-2 border-t border-border bg-offWhite">
          <div className="h-[44px] flex items-center justify-center">
            <p className="text-center text-[13px] text-gold italic">
              {t('incomes.motivationalSubtitle')}
            </p>
          </div>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
              {t('incomes.motivationalSubtitle')}
            </p>
          </div>
        </footer>
      </div>

      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={closePdfModal}
        title={t('common.pdfPreviewTitle')}
        summary={exportSubtitle}
        pdfUrl={pdfUrl}
        isGenerating={pdfGenerating}
        error={pdfError}
        onDownload={downloadPreviewPdf}
        downloadLabel={t('common.pdfDownloadLabel')}
        previewLabel={t('common.pdfPreviewTitle')}
      />

      <RightDrawer
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingIncome ? t('incomes.editIncome') : t('incomes.addIncome')}
        subtitle={t('incomes.subtitle')}
        accent="#3E8E5C"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="income-description" className="block font-body text-ink mb-2 font-serif">
              {t('incomes.description')} <span className="text-terracotta">*</span>
            </label>
            <input
              id="income-description"
              type="text"
              required
              value={formData.description}
              onChange={(e) => { const v = e.target.value; setFormData(prev => ({ ...prev, description: v })) }}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              placeholder={t('incomes.descriptionPlaceholder')}
              aria-label={t('incomes.descriptionAria')}
            />
            {suggestedCategoryId && !formData.categoryId && categoryLabelMap.get(suggestedCategoryId) && (
              <button
                type="button"
                onClick={() => { setFormData(f => ({ ...f, categoryId: suggestedCategoryId })); setSuggestedCategoryId(null) }}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-petrol border border-petrol/30 rounded-full px-2.5 py-1 hover:bg-petrol/5 transition-vintage"
              >
                <span className="text-ink/40">{t('common.suggestionLabel')}</span>
                <span className="font-medium">{categoryLabelMap.get(suggestedCategoryId)}</span>
                <Check className="w-3 h-3 ml-0.5" />
              </button>
            )}
          </div>

          <Select
            label={t('incomes.category')}
            value={formData.categoryId}
            onChange={(v) => setFormData({ ...formData, categoryId: v })}
            options={categoryOptions}
            required
            variant="modal"
          />

          <div>
            <label htmlFor="income-amount" className="block font-serif font-body text-ink mb-2">
              {t('incomes.amount')} <span className="text-terracotta">*</span>
            </label>
            <CurrencyInput
              id="income-amount"
              required
              value={formData.amount}
              onChange={(v) => setFormData({ ...formData, amount: v })}
              currency={currency}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>

          <div>
            <label htmlFor="income-date" className="block font-serif font-body text-ink mb-2">
              {t('incomes.date')} <span className="text-terracotta">*</span>
            </label>
            <input
              id="income-date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
              aria-label={t('incomes.dateAria')}
            />
          </div>

          <Select
            label={t('incomes.status')}
            value={formData.status}
            onChange={(v) => setFormData({ ...formData, status: (v as IncomeStatus) || 'received' })}
            options={[
              { value: 'received', label: t('incomes.statusReceived') },
              { value: 'pending', label: t('incomes.statusPending') },
            ]}
            variant="modal"
            required
          />

          <div>
            <label htmlFor="income-notes" className="block font-serif font-body text-ink mb-2">
              {t('incomes.notes')}
            </label>
            <textarea
              id="income-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder={t('incomes.notesPlaceholder')}
              aria-label={t('common.notesAria')}
            />
          </div>

          {!editingIncome && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-5 h-5 rounded border-border"
                />
                <span className="text-sm font-body text-ink">{t('incomes.recurring')}</span>
              </label>
              {formData.isRecurring && (
                <div className="space-y-3 pl-7">
                  <Select
                    label={t('incomes.recurrence')}
                    value={formData.recurrenceFrequency}
                    onChange={(v) => setFormData({ ...formData, recurrenceFrequency: v })}
                    options={RECURRENCE_OPTIONS}
                    required
                    variant="modal"
                  />
                  <div>
                    <label className="block text-sm font-body text-ink mb-2">{t('incomes.recurringAmountLabel')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isFixedAmount: true })}
                        className={`p-3 rounded-lg border text-left transition-vintage ${
                          formData.isFixedAmount ? 'border-coffee bg-coffee/5' : 'border-border hover:bg-paper'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-0.5 ${formData.isFixedAmount ? 'text-coffee' : 'text-ink'}`}>{t('incomes.fixedAmountOption')}</div>
                        <div className="text-xs text-ink/60">repete com o valor atual</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isFixedAmount: false })}
                        className={`p-3 rounded-lg border text-left transition-vintage ${
                          !formData.isFixedAmount ? 'border-petrol bg-petrol/5' : 'border-border hover:bg-paper'
                        }`}
                      >
                        <div className={`text-sm font-semibold mb-0.5 ${!formData.isFixedAmount ? 'text-petrol' : 'text-ink'}`}>{t('incomes.variableAmountOption')}</div>
                        <div className="text-xs text-ink/60">{t('incomes.variableAmountOptionDesc')}</div>
                      </button>
                    </div>
                    {!formData.isFixedAmount && (
                      <p className="mt-2 text-xs text-petrol bg-petrol/5 border border-petrol/20 rounded-lg p-2">
                        📋 {t('incomes.variableAmountNote')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {formError && (
            <p className="text-[12.5px] text-[#B05C3A] rounded-lg bg-[#B05C3A]/8 border border-[#B05C3A]/25 px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </RightDrawer>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title={t('incomes.deleteIncome')}
        message={t('incomes.confirmDelete')}
        confirmLabel={t('incomes.deleteButton')}
        confirmAccent="#3E8E5C"
        loading={deleting}
      />

      <ConfirmModal
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={confirmReject}
        title={t('incomes.confirmRejectRecurring')}
        message={t('incomes.rejectRecurringConfirmMessage')}
        confirmLabel={t('incomes.rejectRecurringButton')}
        confirmAccent="#2F6F7E"
        loading={rejecting}
      />

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={t('incomes.detailsTitle')}
      >
        {detailIncome && (() => {
          const { attachmentUrl, cleanNotes } = parseLegacyAttachment(detailIncome.notes)
          const hasAttachment = Boolean(detailIncome.attachment_path || attachmentUrl)
          return (
            <div className="space-y-3 text-sm text-ink/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.description')}</p>
                <p className="text-base text-ink">{detailIncome.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.category')}</p>
                  <CategoryPathStack
                    label={getCategoryLabel(detailIncome.category_id, detailIncome.category_name)}
                    icon={detailIncome.category_id ? categoryIconMap.get(detailIncome.category_id) : null}
                    className="mt-1"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.date')}</p>
                  <p>{formatDate(detailIncome.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.status')}</p>
                  <p>{getIncomeStatusLabel(detailIncome.status)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.amount')}</p>
                  <p className="font-numbers">{formatMoney(detailIncome.amount_cents, currency, locale)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.notes')}</p>
                <p>{cleanNotes || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.attachment')}</p>
                {hasAttachment ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        window.open(await getAttachmentViewUrl(detailIncome.attachment_path, attachmentUrl), '_blank', 'noopener,noreferrer')
                      } catch {
                        alert(t('incomes.attachmentOpenError'))
                      }
                    }}
                    className="text-petrol hover:opacity-80 transition-vintage"
                  >
                    {t('incomes.viewAttachment')}
                  </button>
                ) : (
                  <p>{t('incomes.noAttachmentFile')}</p>
                )}
              </div>
              {detailIncome.created_by && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">{t('incomes.createdByLabel')}</p>
                  <p>{familyMembers.get(detailIncome.created_by) ?? '-'}</p>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      <CategorySettingsModal
        isOpen={isCategorySettingsOpen}
        onClose={() => setIsCategorySettingsOpen(false)}
        familyId={familyId}
        currency={currency}
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
          { value: '', label: t('filterSheet.allOption') },
          { value: 'received', label: t('incomes.statusReceived') },
          { value: 'pending', label: t('incomes.statusPending') },
        ]}
        onApply={(m, y, status) => {
          setSelectedMonth(m)
          setSelectedYear(y)
          setSelectedStatus((status as IncomeStatus) || '')
        }}
      />

      <Modal isOpen={showPaywallModal} onClose={() => setShowPaywallModal(false)} title={t('common.limitReached')}>
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
    </>
  )
}
