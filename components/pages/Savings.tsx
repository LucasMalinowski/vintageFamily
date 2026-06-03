'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '@/components/layout/Topbar'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import FilterSidebar from '@/components/layout/FilterSidebar'
import FilterSearchBar from '@/components/layout/FilterSearchBar'
import Select from '@/components/ui/Select'
import MonthYearPicker from '@/components/ui/MonthYearPicker'
import Modal from '@/components/ui/Modal'
import RightDrawer from '@/components/ui/RightDrawer'
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
  getYearLabel,
  getYearRange,
  isDateWithinFilters,
  ALL_MONTHS_VALUE,
  ALL_YEARS_VALUE,
} from '@/lib/dates'
import { ChevronDown, FileDown, FileText, Folder, Pencil, PiggyBank, SlidersHorizontal, Search, Plus, Tag, Target, TrendingDown, TrendingUp, Upload, X } from 'lucide-react'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { matchesSearch } from '@/lib/filterSearch'
import FilterSheet from '@/components/layout/FilterSheet'
import CurrencyInput from '@/components/ui/CurrencyInput'
import PdfPreviewModal from '@/components/export/PdfPreviewModal'
import { buildBrandedPdfBlob, downloadBlob, downloadCsv, openHtmlAsPdf } from '@/lib/report-export'

interface Saving {
  id: string
  name: string
  icon: string | null
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
  created_by?: string | null
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
  const { familyId, user } = useAuth()
  const [savings, setSavings] = useState<Saving[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [allTimeContributions, setAllTimeContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedSavingId, setSelectedSavingId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false)

  // modals
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false)
  const [isSavingSettingsOpen, setIsSavingSettingsOpen] = useState(false)
  const [detailsSaving, setDetailsSaving] = useState<Saving | null>(null)
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null)
  const [detailsContributions, setDetailsContributions] = useState<Contribution[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [familyMembers, setFamilyMembers] = useState<Map<string, string>>(new Map())
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfGenerating, setPdfGenerating] = useState(false)

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

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const savingLabelMap = useMemo(() => buildSavingLabelMap(savings), [savings])
  const savingOptions = useMemo(() => buildSavingOptions(savings), [savings])
  const savingTree = useMemo(() => buildSavingTree(savings), [savings])
  const SAVING_COLORS = ['#6FBF8A', '#C2A45D', '#3F6E7A', '#B05C3A', '#3E5F4B', '#7A66A1', '#3E8E5C', '#A58E5F']

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
      .select('id,name,icon,target_cents,parent_id,is_system')
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

  async function loadAllTimeContributions() {
    const { data } = await supabase
      .from('savings_contributions')
      .select('saving_id,amount_cents,date,type')
      .eq('family_id', familyId!)
    setAllTimeContributions((data || []) as Contribution[])
  }

  useEffect(() => {
    if (familyId) {
      loadSavings()
      loadContributions()
      loadAllTimeContributions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, selectedMonth, selectedYear, selectedSavingId])

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
      created_by: user?.id ?? null,
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
      created_by: user?.id ?? null,
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

  // Analytics
  const totalBalance = useMemo(
    () => allTimeContributions.reduce((s, c) => s + (c.type === 'withdrawal' ? -c.amount_cents : c.amount_cents), 0),
    [allTimeContributions],
  )

  const periodDeposits = useMemo(
    () => contributions.filter((c) => c.type !== 'withdrawal').reduce((s, c) => s + c.amount_cents, 0),
    [contributions],
  )

  const periodWithdrawals = useMemo(
    () => contributions.filter((c) => c.type === 'withdrawal').reduce((s, c) => s + c.amount_cents, 0),
    [contributions],
  )

  const globalTarget = useMemo(
    () => savings.filter((s) => !s.parent_id && s.target_cents).reduce((s, sv) => s + (sv.target_cents || 0), 0),
    [savings],
  )
  const globalProgressPct = globalTarget > 0 ? Math.round((totalBalance / globalTarget) * 100) : null

  const periodIncome = useMemo(
    () => contributions.filter((c) => c.type === 'income').reduce((s, c) => s + c.amount_cents, 0),
    [contributions],
  )


  const monthLabelSav = selectedMonth !== ALL_MONTHS_VALUE ? getMonthLabel(selectedMonth) : 'Todos'

  const perSavingAnalytics = useMemo(() => {
    const analytics: Array<{
      saving: Saving
      balance: number
      prevBalance: number
      periodDep: number
      periodWit: number
    }> = []
    for (const s of savings) {
      if (s.parent_id) continue
      const allTimeDep = allTimeContributions
        .filter((c) => c.saving_id === s.id && c.type !== 'withdrawal')
        .reduce((sum, c) => sum + c.amount_cents, 0)
      const allTimeWit = allTimeContributions
        .filter((c) => c.saving_id === s.id && c.type === 'withdrawal')
        .reduce((sum, c) => sum + c.amount_cents, 0)
      const balance = allTimeDep - allTimeWit
      const periodDep = contributions
        .filter((c) => c.saving_id === s.id && c.type !== 'withdrawal')
        .reduce((sum, c) => sum + c.amount_cents, 0)
      const periodWit = contributions
        .filter((c) => c.saving_id === s.id && c.type === 'withdrawal')
        .reduce((sum, c) => sum + c.amount_cents, 0)
      const prevBalance = balance - periodDep + periodWit
      analytics.push({ saving: s, balance, prevBalance, periodDep, periodWit })
    }
    return analytics
  }, [savings, allTimeContributions, contributions])

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

  const exportRows = visibleSavings.map((saving) => {
    const totals = savingTotals.get(saving.id)
    const total = totals?.total ?? 0

    return [
      getSavingLabel(saving.id),
      saving.is_system ? 'Sistema' : 'Manual',
      saving.target_cents ? formatBRL(saving.target_cents) : '',
      totals?.count ? String(totals.count) : '0',
      totals?.lastDate ? formatDate(totals.lastDate) : '',
      formatBRL(total),
    ]
  })

  const exportSubtitle = [
    `Período: ${selectedMonth === ALL_MONTHS_VALUE ? 'todos os meses' : getMonthLabel(selectedMonth)} / ${selectedYear === ALL_YEARS_VALUE ? 'todos os anos' : getYearLabel(selectedYear)}`,
    selectedSavingId ? `Categoria: ${getSavingLabel(selectedSavingId)}` : null,
    searchTerm ? `Busca: ${searchTerm}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  const exportTable = {
    filename: `poupancas-${format(new Date(), 'yyyy-MM-dd')}`,
    title: 'Poupanças',
    subtitle: exportSubtitle,
    headers: ['Nome', 'Tipo', 'Meta', 'Total', 'Movimentos', 'Última atualização'],
    rows: exportRows,
  }

  const buildSavingsPdfBlob = () => {
    const totalSaved = visibleSavings.reduce((sum, s) => sum + (savingTotals.get(s.id)?.total ?? 0), 0)
    const totalTarget = visibleSavings.reduce((sum, s) => sum + (s.target_cents ?? 0), 0)
    return buildBrandedPdfBlob({
      title: 'Poupanças',
      filterSummary: exportSubtitle || 'Sem filtros ativos',
      headers: ['Nome', 'Tipo', 'Meta', 'Movimentos', 'Ultima atualizacao', 'Total'],
      rows: exportRows,
      cards: [
        { label: 'TOTAL GUARDADO', value: formatBRL(totalSaved) },
        ...(totalTarget > 0 ? [{ label: 'META TOTAL', value: formatBRL(totalTarget) }] : []),
        { label: 'POUPANÇAS', value: String(visibleSavings.length) },
      ],
      generatedDate: formatDate(new Date()),
      accentColor: '#3F6E7A',
    })
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
      const blob = await buildSavingsPdfBlob()
      setPdfBlob(blob)
      setPdfUrl(URL.createObjectURL(blob))
    } finally {
      setPdfGenerating(false)
      setExportingFormat(null)
    }
  }

  const downloadPreviewPdf = async () => {
    const url = pdfUrl || URL.createObjectURL(await buildSavingsPdfBlob())
    openHtmlAsPdf(url)
  }

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
          title="Poupança"
          subtitle="Guardar é uma forma silenciosa de cuidar."
          accent="#3F6E7A"
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
                  aria-label="Buscar poupanças"
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
                onClick={() => setIsDepositOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-[38px] px-3 rounded-[10px] border border-border bg-bg text-petrol text-sm font-medium"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Guardar</span>
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
            aria-label="Mais opções"
          >
            <Plus className="w-5 h-5" />
          </button>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-64 overflow-hidden animate-popup-in">
                <button
                  type="button"
                  onClick={() => { setIsDepositOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Guardar em poupança</p>
                    <p className="text-xs text-ink/45">Registrar depósito</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsWithdrawalOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Resgatar da poupança</p>
                    <p className="text-xs text-ink/45">Registrar retirada</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSavingSettingsOpen(true); setAddMenuOpen(false) }}
                  className="w-full text-left px-4 py-3.5 hover:bg-paper transition-vintage border-b border-border flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-[10px] bg-ink/[0.06] flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-ink/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Categorias</p>
                    <p className="text-xs text-ink/45">Gerenciar poupanças</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { handleExportCsv(); setAddMenuOpen(false) }}
                  disabled={!visibleSavings.length || exportingFormat !== null}
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
                  type="button"
                  onClick={() => { handleExportPdf(); setAddMenuOpen(false) }}
                  disabled={!visibleSavings.length || exportingFormat !== null}
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

        {/* Desktop toolbar */}
        <div className="hidden md:flex items-center gap-2.5 px-6 py-3 border-b border-border bg-bg">
          <button
            type="button"
            onClick={() => setFiltersOpen(prev => !prev)}
            className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] border border-border bg-white text-ink text-[13px] font-medium hover:bg-paper transition-vintage"
          >
            <SlidersHorizontal className="w-4 h-4 text-petrol" />
            {selectedMonth === ALL_MONTHS_VALUE
              ? (selectedYear === ALL_YEARS_VALUE ? 'Todos' : String(selectedYear))
              : `${getMonthLabel(selectedMonth).slice(0, 3)} ${selectedYear !== ALL_YEARS_VALUE ? selectedYear : ''}`}
            <ChevronDown className={`w-3.5 h-3.5 text-ink/40 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center h-[38px] bg-white border border-border rounded-[10px] px-3 gap-2 flex-1 max-w-[380px]">
            <Search className="w-4 h-4 text-petrol shrink-0" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou categoria..." aria-label="Buscar por nome ou categoria" className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink/40 outline-none" />
          </div>
          <div className="flex-1" />
          <button type="button" onClick={() => setIsSavingSettingsOpen(true)} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage">
            <Tag className="w-4 h-4" /> Categorias
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!visibleSavings.length || exportingFormat !== null} className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] border border-border bg-white text-ink/70 text-[13px] font-medium hover:bg-paper transition-vintage disabled:opacity-40">
            <Upload className="w-4 h-4" /> Exportar
          </button>
          <button type="button" onClick={() => setIsSavingSettingsOpen(true)} className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] text-white text-[13px] font-semibold transition-vintage" style={{ background: '#3F6E7A' }}>
            <Plus className="w-4 h-4" /> Novo sonho
          </button>
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
                  label="Poupança"
                  value={selectedSavingId}
                  onChange={setSelectedSavingId}
                  options={[{ value: '', label: 'Todas' }, ...savingOptions]}
                />
              </div>
              {activeFiltersCount > 0 && (
                <button type="button" onClick={clearFilters} className="text-xs text-[#B05C3A] hover:underline self-end pb-2">Limpar filtros</button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable cards area */}
        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-visible">
          <div className="w-full flex flex-col md:px-6 md:pb-4">
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
                  label="Categoria"
                  value={selectedSavingId}
                  onChange={setSelectedSavingId}
                  options={[{ value: '', label: 'Todas' }, ...savingOptions]}
                />
              </FilterSidebar>
            </div>

            <div className="flex-1 min-w-0 flex flex-col px-[18px] pt-3 pb-4 md:px-6 md:pt-4 md:pb-4">
              {/* ── Analytics section ── */}
              {!loading && savings.length > 0 && (
                <div className="space-y-4 mb-5">
                  {/* Row 1: current state */}
                  <div className="grid grid-cols-2 gap-3">
                    <AnalyticsKpiCard
                      label="Saldo atual"
                      value={formatBRL(totalBalance)}
                      iconTheme="teal"
                      icon={PiggyBank}
                    />
                    {globalProgressPct != null ? (
                      <AnalyticsKpiCard
                        label="Meta global"
                        value={`${Math.min(globalProgressPct, 100)}%`}
                        sub={`de ${formatBRL(globalTarget)}`}
                        iconTheme="orange"
                        icon={Target}
                      />
                    ) : (
                      <AnalyticsKpiCard
                        label="Poupanças"
                        value={String(savings.filter(s => !s.parent_id).length)}
                        sub="categorias ativas"
                        iconTheme="blue"
                        icon={Folder}
                      />
                    )}
                  </div>

                  {/* Row 2: period activity */}
                  <div className="grid grid-cols-2 gap-3">
                    <AnalyticsKpiCard
                      label="Aportes no mês"
                      value={formatBRL(periodDeposits)}
                      iconTheme="green"
                      icon={TrendingUp}
                      small
                    />
                    <AnalyticsKpiCard
                      label="Resgates no mês"
                      value={formatBRL(periodWithdrawals)}
                      iconTheme="red"
                      icon={TrendingDown}
                      small
                    />
                  </div>

                  {/* Period summary */}
                  {(periodDeposits > 0 || periodWithdrawals > 0) && (
                    <div className="bg-white rounded-xl border border-border shadow-soft p-4">
                      <h3 className="text-sm font-semibold text-ink font-serif mb-3">
                        Movimentação: {monthLabelSav}{selectedYear !== ALL_YEARS_VALUE ? `/${selectedYear}` : ''}
                      </h3>
                      <div className="flex gap-3 flex-wrap">
                        {periodDeposits > 0 && (
                          <div className="flex-1 min-w-[100px] rounded-lg p-3 border" style={{ background: 'rgba(111,191,138,.08)', borderColor: 'rgba(111,191,138,.25)' }}>
                            <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#3E9E6A]/80 mb-1">Aportes</p>
                            <p className="text-[15px] font-bold text-[#3E9E6A] tabular-nums">+{formatBRL(periodDeposits)}</p>
                          </div>
                        )}
                        {periodWithdrawals > 0 && (
                          <div className="flex-1 min-w-[100px] rounded-lg p-3 border" style={{ background: 'rgba(192,96,96,.08)', borderColor: 'rgba(192,96,96,.25)' }}>
                            <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#C06060]/80 mb-1">Resgates</p>
                            <p className="text-[15px] font-bold text-[#C06060] tabular-nums">−{formatBRL(periodWithdrawals)}</p>
                          </div>
                        )}
                        <div className="flex-1 min-w-[100px] rounded-lg p-3 border border-border bg-bg">
                          <p className="text-[9.5px] font-bold uppercase tracking-wide text-ink/50 mb-1">Saldo líquido</p>
                          <p className="text-[15px] font-bold tabular-nums" style={{ color: periodDeposits - periodWithdrawals >= 0 ? '#3E9E6A' : '#C06060' }}>
                            {periodDeposits - periodWithdrawals >= 0 ? '+' : ''}{formatBRL(periodDeposits - periodWithdrawals)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ── SavingsCardLarge grid — desktop only ── */}
              {!loading && savingTree.length > 0 && (
                <div className="hidden md:block mb-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-5 h-px bg-petrol/40" />
                    <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-petrol/70">Poupanças</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {savingTree.map((savingNode, i) => {
                      const analytics = perSavingAnalytics.find(a => a.saving.id === savingNode.id)
                      const balance = analytics?.balance ?? 0
                      const lastDep = analytics?.periodDep ?? 0
                      const c = SAVING_COLORS[i % SAVING_COLORS.length]
                      const pct = savingNode.target_cents ? Math.min(100, Math.round((balance / savingNode.target_cents) * 100)) : null
                      return (
                        <div
                          key={savingNode.id}
                          className="rounded-[14px] border p-[18px] relative overflow-hidden cursor-pointer hover:shadow-soft transition-vintage"
                          style={{ background: `linear-gradient(140deg, #fff 0%, ${c}0F 100%)`, borderColor: `${c}38` }}
                          onClick={() => openDetails(savingNode)}
                        >
                          {/* Halo */}
                          <div className="absolute right-[-30px] top-[-30px] w-[110px] h-[110px] rounded-full pointer-events-none" style={{ background: `${c}18` }} />
                          <div className="flex items-start gap-3 relative">
                            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: `${c}20`, color: c }}>
                              <CategoryIcon name={savingNode.icon} className="w-[18px] h-[18px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-serif text-[17px] text-coffee font-medium leading-tight">{savingNode.name}</p>
                              <p className="text-[11.5px] text-ink/50 mt-1">
                                {savingNode.target_cents ? `Meta ${formatBRL(savingNode.target_cents)}` : 'Sem meta'}
                                {lastDep > 0 ? ` · última + ${formatBRL(lastDep)}` : ''}
                              </p>
                            </div>
                            {pct !== null && (
                              <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${c}20`, color: c }}>{pct}%</span>
                            )}
                          </div>
                          <p className="font-numbers font-light text-[28px] text-coffee tabular-nums mt-3.5" style={{ letterSpacing: '-0.5px' }}>{formatBRL(balance)}</p>
                          {pct !== null && (
                            <div className="mt-2 h-[6px] rounded-full overflow-hidden" style={{ background: `${c}20` }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                            </div>
                          )}
                          <div className="flex gap-2.5 mt-3.5" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => { setIsDepositOpen(true); setDepositForm({ ...emptyTxForm(), savingId: savingNode.id }) }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-[9px] rounded-[10px] text-white font-semibold text-[13px] border-none transition-vintage"
                              style={{ background: c }}
                            >
                              <TrendingUp className="w-[13px] h-[13px]" /> Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => { setIsWithdrawalOpen(true); setWithdrawalForm({ ...emptyTxForm(), savingId: savingNode.id }) }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-[9px] rounded-[10px] font-semibold text-[13px] border border-border bg-white text-coffee transition-vintage"
                            >
                              <TrendingDown className="w-[13px] h-[13px]" /> Resgatar
                            </button>
                          </div>
                          {savingNode.children.length > 0 && (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: `${c}28` }}>
                              {savingNode.children.map((ch) => {
                                const chAnalytics = perSavingAnalytics.find(a => a.saving.id === ch.id)
                                const chBalance = chAnalytics?.balance ?? 0
                                return (
                                  <div key={ch.id} className="flex items-center gap-2 py-1">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c }} />
                                    <span className="flex-1 text-[12px] text-ink/70">{ch.name}</span>
                                    <span className="text-[12px] font-semibold text-coffee tabular-nums">{formatBRL(chBalance)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Mobile per-saving cards - desktop has the table above */}
              {!loading && perSavingAnalytics.length > 0 && (
                <div className="md:hidden space-y-2.5">
                  <h3 className="text-sm font-semibold text-ink font-serif">Poupanças</h3>
                  {perSavingAnalytics.map(({ saving, balance }) => {
                    const pct = saving.target_cents
                      ? Math.min(100, Math.round((balance / saving.target_cents) * 100))
                      : null
                    return (
                      <div key={saving.id} className="bg-bg border border-border rounded-vintage shadow-vintage p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CategoryIcon name={saving.icon} className="w-4 h-4 text-ink/50" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">{saving.name}</p>
                              <p className="text-xs text-ink/50 tabular-nums">{formatBRL(balance)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              {saving.target_cents ? (
                                <>
                                  <p className="text-xs font-medium text-ink/70 tabular-nums">{pct}%</p>
                                  <p className="text-[10px] text-ink/40 tabular-nums">de {formatBRL(saving.target_cents)}</p>
                                </>
                              ) : (
                                <p className="text-xs text-ink/30">Sem meta</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openEdit(saving)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/35 hover:text-petrol hover:bg-petrol/10 transition-vintage"
                              title="Editar meta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {pct !== null && (
                          <div className="mt-3 h-1.5 bg-ink/8 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct >= 100 ? '#3E9E6A' : '#2F6F7E' }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Mobile footer - sticky outside scroll */}
        <div className="md:hidden shrink-0 h-[42px] flex items-center justify-center border-t border-border bg-offWhite">
          <p className="text-center text-[13px] text-gold italic">
            Poupança é um abraço longo no amanhã.
          </p>
        </div>

        {/* Desktop footer */}
        <footer className="hidden md:block mt-auto w-full">
          <div className="h-[56px] bg-paper flex items-center justify-center px-6">
            <p className="text-center text-[13px] text-gold italic">
                Poupança é um abraço longo no amanhã.
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

      {/* Guardar drawer */}
      <RightDrawer isOpen={isDepositOpen} onClose={() => { setIsDepositOpen(false); setDepositForm(emptyTxForm()) }} title="Guardar na Poupança" subtitle="Guardar é uma forma silenciosa de cuidar." accent="#3F6E7A">
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
            <label htmlFor="deposit-amount" className="block font-serif font-body text-ink mb-2">
              Valor (R$) <span className="text-terracotta">*</span>
            </label>
            <CurrencyInput
              id="deposit-amount"
              required
              value={depositForm.amount}
              onChange={(v) => setDepositForm({ ...depositForm, amount: v })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label htmlFor="deposit-date" className="block font-serif font-body text-ink mb-2">
              Data <span className="text-terracotta">*</span>
            </label>
            <input
              id="deposit-date"
              type="date"
              required
              value={depositForm.date}
              onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
              aria-label="Data do depósito"
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label htmlFor="deposit-notes" className="block font-serif font-body text-ink mb-2">Observação</label>
            <textarea
              id="deposit-notes"
              value={depositForm.notes}
              onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder="Notas adicionais..."
              aria-label="Observação do depósito"
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
      </RightDrawer>

      {/* Resgatar drawer */}
      <RightDrawer isOpen={isWithdrawalOpen} onClose={() => { setIsWithdrawalOpen(false); setWithdrawalForm(emptyTxForm()) }} title="Resgatar da Poupança" subtitle="Cada resgate é uma conquista que voltou para a vida." accent="#3F6E7A">
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
            <label htmlFor="withdrawal-amount" className="block font-serif font-body text-ink mb-2">
              Valor a resgatar (R$) <span className="text-terracotta">*</span>
            </label>
            <CurrencyInput
              id="withdrawal-amount"
              required
              value={withdrawalForm.amount}
              onChange={(v) => setWithdrawalForm({ ...withdrawalForm, amount: v })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label htmlFor="withdrawal-date" className="block font-serif font-body text-ink mb-2">
              Data <span className="text-terracotta">*</span>
            </label>
            <input
              id="withdrawal-date"
              type="date"
              required
              value={withdrawalForm.date}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })}
              aria-label="Data do resgate"
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label htmlFor="withdrawal-notes" className="block font-serif font-body text-ink mb-2">Observação</label>
            <textarea
              id="withdrawal-notes"
              value={withdrawalForm.notes}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })}
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none"
              rows={3}
              placeholder="Motivo do resgate..."
              aria-label="Motivo do resgate"
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
      </RightDrawer>

      {/* Ver detalhes RightDrawer */}
      <RightDrawer
        isOpen={!!detailsSaving}
        onClose={() => { setDetailsSaving(null); setDetailsContributions([]) }}
        title={detailsSaving ? getSavingLabel(detailsSaving.id) : ''}
        subtitle="Movimentações desta poupança."
        accent="#3F6E7A"
      >
        {detailsLoading ? (
          <div className="text-center py-8 text-ink/60">Carregando…</div>
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
                    {c.created_by && (
                      <p className="text-xs text-ink/30">{familyMembers.get(c.created_by) ?? '-'}</p>
                    )}
                  </div>
                </div>
                <span className={`font-numbers font-semibold text-sm ${c.type === 'withdrawal' ? 'text-terracotta' : 'text-olive'}`}>
                  {c.type === 'withdrawal' ? '−' : '+'}{formatBRL(c.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </RightDrawer>

      {/* Editar poupança drawer */}
      <RightDrawer
        isOpen={!!editingSaving}
        onClose={() => setEditingSaving(null)}
        title="Editar Poupança"
        subtitle="Ajuste o nome ou a meta da poupança."
        accent="#3F6E7A"
      >
        <form onSubmit={handleEditSavingSubmit} className="space-y-4">
          <div>
            <label htmlFor="saving-name" className="block font-serif font-body text-ink mb-2">
              Nome <span className="text-terracotta">*</span>
            </label>
            <input
              id="saving-name"
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              aria-label="Nome da poupança"
              className="w-full px-4 py-3 bg-bg/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50"
            />
          </div>
          <div>
            <label htmlFor="saving-target" className="block font-serif font-body text-ink mb-2">Meta (R$)</label>
            <CurrencyInput
              id="saving-target"
              value={editForm.target}
              onChange={(v) => setEditForm({ ...editForm, target: v })}
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
      </RightDrawer>

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
