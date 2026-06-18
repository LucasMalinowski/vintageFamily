'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Download, ExternalLink, FileUp, Landmark, Loader2, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getBankTutorials, getBankTutorialsById } from '@/lib/bank-statements/tutorials'
import type { AppLocale } from '@/lib/i18n/getLocale'
import type {
  BankId,
  BankTutorial,
  ImportPreviewItem,
  ImportPreviewResult,
  ReviewedImportItem,
  StatementFileFormat,
} from '@/lib/bank-statements/types'
import { getAuthBearerToken } from '@/lib/billing/client'
import { MAX_CSV_SIZE_BYTES, MAX_OFX_SIZE_BYTES } from '@/lib/bank-statements/constants'
import type { CategoryRecord } from '@/lib/categories'
import { buildCategoryLabelMap, resolveCategoryName } from '@/lib/categories'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

interface ImportResponse {
  batchId: string
  bank: BankId
  format: StatementFileFormat
  fileHash: string
  pageCount: number
  summary: {
    totalFound: number
    incomesCreated: number
    expensesCreated: number
    duplicatesIgnored: number
    lowConfidenceCount: number
  }
  warnings: string[]
  preview: Array<{
    previewKey: string
    date: string
    description: string
    amount: number
    type: 'income' | 'expense'
    confidence: number
    lowConfidence: boolean
    isDuplicate: boolean
    duplicateReason: 'file' | 'database' | 'none'
    categoryId: string | null
    ignore: boolean
  }>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onImported?: () => void
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const maxCsvSizeLabel = `${Math.round(MAX_CSV_SIZE_BYTES / (1024 * 1024))} MB`
const maxOfxSizeLabel = `${Math.round(MAX_OFX_SIZE_BYTES / (1024 * 1024))} MB`

const detectFormatFromFile = (candidate: File | null): StatementFileFormat | null => {
  if (!candidate) return null
  const lowerName = candidate.name.toLowerCase()
  if (lowerName.endsWith('.ofx')) return 'ofx'
  if (lowerName.endsWith('.csv') || ['text/csv', 'application/csv', 'text/comma-separated-values'].includes(candidate.type)) return 'csv'
  return null
}

function BankBadge({ bankId }: { bankId: BankId }) {
  const locale = useLocale() as AppLocale
  const t = useTranslations()
  const tutorial = useMemo(() => getBankTutorialsById(locale)[bankId], [locale, bankId])
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white text-xs font-semibold uppercase shadow-soft"
        style={{ color: tutorial.accent }}
        aria-label={t('bankStatement.bankIconAria', { bank: tutorial.name })}
      >
        {tutorial.shortName.slice(0, 2)}
      </div>
    )
  }

  return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <Image
            src={tutorial.iconUrl}
            alt={t('bankStatement.bankIconAlt', { bank: tutorial.name })}
            fill
            unoptimized
            className="object-cover"
            onError={() => setImageError(true)}
        />
      </div>
  )
}

function getFormatBadge(tutorial: BankTutorial, t: ReturnType<typeof useTranslations>) {
  if (tutorial.ofxAvailability === 'official') {
    return { label: t('bankStatement.ofxConfirmed'), className: 'bg-emerald-100 text-emerald-800' }
  }
  if (tutorial.ofxAvailability === 'secondary') {
    return { label: t('bankStatement.ofxLikely'), className: 'bg-sky-100 text-sky-800' }
  }
  return { label: t('bankStatement.csvOnly'), className: 'bg-slate-100 text-slate-700' }
}

const buildInitialReviewItems = (items: ImportPreviewItem[]): ReviewedImportItem[] =>
    items.map((item) => ({
      previewKey: item.previewKey,
      description: item.description,
      type: item.type,
      categoryId: item.categoryId,
      ignore: item.isDuplicate,
    }))

export default function BankStatementImportModal({ isOpen, onClose, onImported }: Props) {
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const { familyId } = useAuth()
  const [selectedBank, setSelectedBank] = useState<BankId>('itau')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewedImportItem[]>([])
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const bankTutorials = useMemo(() => getBankTutorials(locale), [locale])
  const bankTutorialsById = useMemo(() => getBankTutorialsById(locale), [locale])
  const tutorial = useMemo(() => bankTutorialsById[selectedBank], [bankTutorialsById, selectedBank])
  const selectedFormat = detectFormatFromFile(file)
  const supportsOfx = tutorial.supportedImportFormats.includes('ofx')
  const acceptedFormatsLabel = supportsOfx ? t('bankStatement.acceptedFormatsOfxAndCsv') : 'CSV'
  const fileInputAccept = supportsOfx
      ? '.ofx,application/x-ofx,application/ofx,.csv,text/csv'
      : '.csv,text/csv,application/csv'
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories, locale), [categories, locale])
  const reviewItemsByKey = useMemo(
      () => new Map(reviewItems.map((item) => [item.previewKey, item])),
      [reviewItems]
  )

  const reviewSummary = useMemo(() => {
    if (!preview) return null
    return {
      totalFound: preview.items.length,
      incomesReviewed: reviewItems.filter((item) => !item.ignore && item.type === 'income').length,
      expensesReviewed: reviewItems.filter((item) => !item.ignore && item.type === 'expense').length,
      ignoredCount: reviewItems.filter((item) => item.ignore).length,
      lowConfidenceCount: preview.items.filter((item) => item.lowConfidence).length,
    }
  }, [preview, reviewItems])

  useEffect(() => {
    if (!isOpen || !familyId) return

    let active = true
    const loadCategories = async () => {
      const { data, error: categoryError } = await supabase
          .from('categories')
          .select('id,name,name_en,name_es,kind,parent_id,is_system,icon')
          .eq('family_id', familyId)
          .order('name', { ascending: true })

      if (!active || categoryError) return
      setCategories((data || []) as CategoryRecord[])
    }

    loadCategories()
    return () => { active = false }
  }, [familyId, isOpen])

  useEffect(() => {
    setPreview(null)
    setReviewItems([])
    setResult(null)
    setError(null)
    setFile(null)
  }, [selectedBank])

  const validateFile = (candidate: File | null) => {
    if (!candidate) return t('bankStatement.errors.selectFile')

    const format = detectFormatFromFile(candidate)
    if (!format) return t('bankStatement.errors.invalidFileType')
    if (!tutorial.supportedImportFormats.includes(format)) {
      return supportsOfx
          ? t('bankStatement.errors.useOfxOrCsvFor', { bank: tutorial.name })
          : t('bankStatement.errors.useCsvOnlyFor', { bank: tutorial.name })
    }
    if (format === 'csv' && candidate.size > MAX_CSV_SIZE_BYTES) return t('bankStatement.errors.csvExceedsLimit', { size: maxCsvSizeLabel })
    if (format === 'ofx' && candidate.size > MAX_OFX_SIZE_BYTES) return t('bankStatement.errors.ofxExceedsLimit', { size: maxOfxSizeLabel })
    return null
  }

  const handleFileSelection = (candidate: File | null) => {
    const validation = validateFile(candidate)
    setError(validation)
    setPreview(null)
    setReviewItems([])
    setResult(null)
    setFile(validation ? null : candidate)
  }

  const handleClearFile = () => {
    setFile(null)
    setError(null)
    setPreview(null)
    setReviewItems([])
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const updateReviewItem = (previewKey: string, patch: Partial<ReviewedImportItem>) => {
    setReviewItems((current) =>
        current.map((item) => (item.previewKey === previewKey ? { ...item, ...patch } : item))
    )
  }

  const handlePreview = async () => {
    const validation = validateFile(file)
    if (validation || !file) {
      setError(validation)
      return
    }

    setLoading(true)
    setError(null)
    setPreview(null)
    setReviewItems([])

    try {
      const token = await getAuthBearerToken()
      if (!token) throw new Error(t('common.sessionExpired'))

      const formData = new FormData()
      formData.append('action', 'preview')
      formData.append('bank', selectedBank)
      formData.append('file', file)

      const response = await fetch('/api/bank-statements/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || t('bankStatement.errors.parseFailed'))

      const previewPayload = payload as ImportPreviewResult
      setPreview(previewPayload)
      setReviewItems(buildInitialReviewItems(previewPayload.items))
    } catch (cause: any) {
      setError(cause?.message || t('bankStatement.errors.parseFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!preview || !file) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAuthBearerToken()
      if (!token) throw new Error(t('common.sessionExpired'))

      const formData = new FormData()
      formData.append('action', 'commit')
      formData.append('bank', selectedBank)
      formData.append('file', file)
      formData.append('reviewPayload', JSON.stringify(reviewItems))

      const response = await fetch('/api/bank-statements/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || t('bankStatement.errors.commitFailed'))

      setResult(payload as ImportResponse)
      posthog.capture(EVENTS.BANK_IMPORT_COMPLETED, {
        bank: selectedBank,
        incomes_created: (payload as ImportResponse).summary.incomesCreated,
        expenses_created: (payload as ImportResponse).summary.expensesCreated,
      })
      onImported?.()
    } catch (cause: any) {
      setError(cause?.message || t('bankStatement.errors.commitFailed'))
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `importacao-extrato-${result.batchId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const resetAndClose = () => {
    setFile(null)
    setError(null)
    setPreview(null)
    setReviewItems([])
    setResult(null)
    setLoading(false)
    setDragging(false)
    onClose()
  }

  if (result) {
    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} title={t('bankStatement.importComplete')} size="xl">
          <div className="flex h-[78vh] flex-col gap-4 overflow-hidden">
            <div className="rounded-2xl border border-border bg-paper p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-serif text-coffee">{t('bankStatement.importSummaryTitle')}</h4>
                  <p className="text-sm text-ink/60">
                    {t('bankStatement.batchLabel', { batchId: result.batchId })} • {result.format.toUpperCase()}
                  </p>
                </div>
                <button
                    type="button"
                    onClick={downloadReport}
                    className="inline-flex items-center gap-2 rounded-md border border-petrol/25 px-3 py-2 text-sm font-semibold text-petrol hover:bg-petrol/5"
                >
                  <Download className="h-4 w-4" />
                  {t('bankStatement.downloadReport')}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl bg-bg p-3 text-sm"><strong>{result.summary.totalFound}</strong><br />{t('bankStatement.statTransactionsFound')}</div>
                <div className="rounded-xl bg-green-50 p-3 text-sm"><strong>{result.summary.incomesCreated}</strong><br />{t('bankStatement.statBecameIncomes')}</div>
                <div className="rounded-xl bg-red-50 p-3 text-sm"><strong>{result.summary.expensesCreated}</strong><br />{t('bankStatement.statBecameExpenses')}</div>
                <div className="rounded-xl bg-amber-50 p-3 text-sm"><strong>{result.summary.duplicatesIgnored}</strong><br />{t('bankStatement.statIgnored')}</div>
                <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>{result.summary.lowConfidenceCount}</strong><br />{t('bankStatement.statLowConfidence')}</div>
              </div>

              {result.warnings.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {result.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                    ))}
                  </div>
              )}
            </div>

            <div className="min-h-0 overflow-auto rounded-2xl border border-border bg-paper">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-bg text-ink/65">
                <tr>
                  <th className="px-3 py-2">{t('bankStatement.columnDate')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnDescription')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnType')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnAmount')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnConfidence')}</th>
                </tr>
                </thead>
                <tbody>
                {result.preview.map((item) => (
                    <tr key={item.previewKey} className="border-t border-border">
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2">{item.type === 'income' ? t('categoryModal.typeIncome') : t('categoryModal.typeExpense')}</td>
                      <td className="px-3 py-2">{formatCurrency(item.amount)}</td>
                      <td className="px-3 py-2">{Math.round(item.confidence * 100)}%</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
    )
  }

  if (preview) {
    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} title={t('bankStatement.reviewImport')} size="xl">
          <div className="flex h-[78vh] flex-col gap-4 overflow-hidden">
            <div className="rounded-2xl border border-border bg-paper p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-serif text-coffee">{t('bankStatement.fileSummaryTitle')}</h4>
                  <p className="text-sm text-ink/60">
                    {tutorial.name} • {preview.format.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                      type="button"
                      onClick={() => {
                        setPreview(null)
                        setReviewItems([])
                        setError(null)
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink/70 hover:bg-bg"
                  >
                    {t('common.back')}
                  </button>
                  <button
                      type="button"
                      onClick={handleCommit}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-md bg-petrol px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    {loading ? t('bankStatement.importing') : t('bankStatement.import')}
                  </button>
                </div>
              </div>

              {reviewSummary && (
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="rounded-xl bg-bg p-3 text-sm"><strong>{reviewSummary.totalFound}</strong><br />{t('bankStatement.reviewStatFound')}</div>
                    <div className="rounded-xl bg-green-50 p-3 text-sm"><strong>{reviewSummary.incomesReviewed}</strong><br />{t('bankStatement.reviewStatIncomes')}</div>
                    <div className="rounded-xl bg-red-50 p-3 text-sm"><strong>{reviewSummary.expensesReviewed}</strong><br />{t('bankStatement.reviewStatExpenses')}</div>
                    <div className="rounded-xl bg-amber-50 p-3 text-sm"><strong>{reviewSummary.ignoredCount}</strong><br />{t('bankStatement.statIgnored')}</div>
                    <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>{reviewSummary.lowConfidenceCount}</strong><br />{t('bankStatement.statLowConfidence')}</div>
                  </div>
              )}

              {preview.warnings.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {preview.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                    ))}
                  </div>
              )}

              {error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
              )}
            </div>

            <div className="min-h-0 overflow-auto rounded-2xl border border-border bg-paper">
              <table className="min-w-[1100px] text-left text-sm">
                <thead className="sticky top-0 bg-bg text-ink/65">
                <tr>
                  <th className="px-3 py-2">{t('bankStatement.columnIgnore')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnDate')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnDescription')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnType')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnCategory')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnAmount')}</th>
                  <th className="px-3 py-2">{t('bankStatement.columnSignals')}</th>
                </tr>
                </thead>
                <tbody>
                {preview.items.map((item) => {
                  const review = reviewItemsByKey.get(item.previewKey)
                  const selectedType = review?.type || item.type
                  const categoryOptions = categories.filter((category) => category.kind === selectedType)

                  return (
                      <tr key={item.previewKey} className="border-t border-border align-top">
                        <td className="px-3 py-3">
                          <input
                              type="checkbox"
                              checked={review?.ignore || false}
                              onChange={(event) => updateReviewItem(item.previewKey, { ignore: event.target.checked })}
                              className="h-4 w-4 rounded border-border text-petrol focus:ring-petrol"
                              aria-label={t('bankStatement.ignoreAria')}
                          />
                        </td>
                        <td className="px-3 py-3 text-ink/80">{item.date}</td>
                        <td className="px-3 py-3">
                          <input
                              type="text"
                              value={review?.description || item.description}
                              onChange={(event) => updateReviewItem(item.previewKey, { description: event.target.value })}
                              className="w-full min-w-[260px] rounded-md border border-border bg-bg px-3 py-2 text-sm"
                              aria-label={t('bankStatement.descriptionAria')}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                              value={selectedType}
                              onChange={(event) =>
                                  updateReviewItem(item.previewKey, {
                                    type: event.target.value as 'income' | 'expense',
                                    categoryId: null,
                                  })}
                              className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
                          >
                            <option value="income">{t('categoryModal.typeIncome')}</option>
                            <option value="expense">{t('categoryModal.typeExpense')}</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                              value={review?.categoryId || ''}
                              onChange={(event) =>
                                  updateReviewItem(item.previewKey, {
                                    categoryId: event.target.value || null,
                                  })}
                              className="w-full min-w-[220px] rounded-md border border-border bg-bg px-3 py-2 text-sm"
                          >
                            <option value="">{t('bankStatement.importedFromStatement')}</option>
                            {categoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {categoryLabelMap.get(category.id) || resolveCategoryName(category, locale)}
                                </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 font-semibold text-sidebar">{formatCurrency(item.amount)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.isDuplicate && (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                              {item.duplicateReason === 'database' ? t('bankStatement.duplicateInDatabase') : t('bankStatement.duplicateInFile')}
                            </span>
                            )}
                            {item.lowConfidence && (
                                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                              {t('bankStatement.confidencePercent', { pct: Math.round(item.confidence * 100) })}
                            </span>
                            )}
                            {!item.isDuplicate && !item.lowConfidence && (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                              {t('bankStatement.simpleReview')}
                            </span>
                            )}
                          </div>
                        </td>
                      </tr>
                  )
                })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
    )
  }

  return (
      <Modal isOpen={isOpen} onClose={resetAndClose} title={t('bankStatement.title')} size="xl">
        <div className="flex flex-col gap-4 lg:grid lg:h-[72vh] lg:overflow-hidden lg:grid-cols-[220px,minmax(0,1fr)]">
          {/* Desktop only: bank list sidebar */}
          <section className="hidden rounded-2xl border border-border bg-bg p-4 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-petrol">
              <Landmark className="h-4 w-4" />
              {t('bankStatement.chooseBank')}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1">
              {bankTutorials.map((item) => {
                const active = item.id === selectedBank
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedBank(item.id)}
                        className={`min-w-0 rounded-xl border p-2.5 text-left transition-vintage ${
                            active ? 'border-petrol bg-paper shadow-soft' : 'border-border bg-offWhite hover:bg-paper'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <BankBadge bankId={item.id} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-sidebar" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide text-ink/50">
                            {getFormatBadge(item, t).label}
                          </div>
                        </div>
                      </div>
                    </button>
                )
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-bg p-4 lg:min-h-0 lg:overflow-hidden">
            {/* Mobile: compact bank select + steps */}
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex items-center gap-3">
                <BankBadge bankId={selectedBank} />
                <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value as BankId)}
                    className="flex-1 rounded-xl border border-border bg-paper px-3 py-2.5 text-sm font-semibold text-sidebar"
                >
                  {bankTutorials.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-2xl border border-border bg-paper p-4">
                <p className="mb-3 text-sm text-ink/65">{tutorial.intro}</p>
                <div className="space-y-2">
                  {tutorial.steps.map((step, index) => (
                      <div key={step.title} className="rounded-xl border border-border/80 bg-offWhite px-3 py-2">
                        <p className="text-sm font-semibold text-sidebar">{index + 1}. {step.title}</p>
                        <p className="mt-0.5 text-xs text-ink/70">{step.detail}</p>
                      </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop: full tutorial */}
            <div className="hidden lg:block min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-paper p-4">
              <div className="mb-3 flex flex-wrap items-start gap-3">
                <BankBadge bankId={selectedBank} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-serif text-coffee">{tutorial.tutorialTitle}</h3>
                    <a
                        href={tutorial.iconSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-petrol/20 px-3 py-1 text-xs font-semibold text-petrol hover:bg-petrol/5"
                    >
                      {t('bankStatement.viewBankApp')}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="mt-1 text-sm text-ink/65">{tutorial.intro}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getFormatBadge(tutorial, t).className}`}>
                  {getFormatBadge(tutorial, t).label}
                </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      tutorial.status === 'validated'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                  }`}>
                  {tutorial.status === 'validated' ? t('bankStatement.sourceVerified') : t('bankStatement.tutorialInValidation')}
                </span>
                </div>
              </div>

              <div className="space-y-2">
                {tutorial.steps.map((step, index) => (
                    <div key={step.title} className="rounded-xl border border-border/80 bg-offWhite px-4 py-2.5">
                      <p className="text-sm font-semibold text-sidebar">{index + 1}. {step.title}</p>
                      <p className="mt-1 text-sm text-ink/70">{step.detail}</p>
                    </div>
                ))}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">{t('bankStatement.observations')}</p>
                <ul className="space-y-1 text-sm text-ink/70">
                  {tutorial.observations.map((note) => (
                      <li key={note}>• {note}</li>
                  ))}
                </ul>
                {tutorial.ofxAvailability !== 'not_confirmed' && tutorial.ofxReferenceUrl && (
                    <p className="mt-3 text-sm text-ink/70">
                      {tutorial.ofxAvailability === 'official'
                          ? t('bankStatement.ofxOfficialSourceNote')
                          : t('bankStatement.ofxSecondarySourceNote')}
                    </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {tutorial.referenceLinks.map((link) => (
                      <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-petrol/20 px-3 py-1 text-xs font-semibold text-petrol hover:bg-petrol/5"
                      >
                        {link.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                  ))}
                  {tutorial.ofxReferenceUrl && tutorial.ofxReferenceLabel && (
                      <a
                          href={tutorial.ofxReferenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                      >
                        {tutorial.ofxReferenceLabel}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                  )}
                </div>
              </div>

              {tutorial.ofxSteps && tutorial.ofxSteps.length > 0 && (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">OFX</p>
                    {tutorial.ofxIntro && <p className="mt-1 text-sm text-ink/70">{tutorial.ofxIntro}</p>}
                    <div className="mt-3 space-y-2">
                      {tutorial.ofxSteps.map((step, index) => (
                          <div key={step.title} className="rounded-xl border border-sky-100 bg-white px-4 py-2.5">
                            <p className="text-sm font-semibold text-sidebar">{index + 1}. {step.title}</p>
                            <p className="mt-1 text-sm text-ink/70">{step.detail}</p>
                          </div>
                      ))}
                    </div>
                  </div>
              )}
            </div>

            <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  handleFileSelection(event.dataTransfer.files?.[0] || null)
                }}
                className={`rounded-2xl border-2 border-dashed p-4 transition-vintage ${
                    dragging ? 'border-petrol bg-petrol/5' : 'border-border bg-offWhite'
                }`}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),240px] lg:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar">{t('bankStatement.statementFile')}</p>
                  <p className="mt-1 text-xs text-ink/45">{t('bankStatement.acceptedFormats', { formats: acceptedFormatsLabel })}</p>
                  <p className="mt-1 text-xs text-ink/45">
                    {supportsOfx
                        ? t('bankStatement.fileLimitsWithOfx', { csvSize: maxCsvSizeLabel, ofxSize: maxOfxSizeLabel })
                        : t('bankStatement.fileLimitsCsvOnly', { csvSize: maxCsvSizeLabel })}
                  </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                      if (file) {
                        handlePreview()
                        return
                      }
                      inputRef.current?.click()
                    }}
                    disabled={loading}
                    className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm disabled:opacity-70 ${
                        file
                            ? 'bg-petrol text-white'
                            : 'border border-petrol/30 bg-bg text-petrol hover:bg-paper'
                    }`}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  {file
                      ? (loading ? t('bankStatement.processing') : t('bankStatement.preview'))
                      : t('bankStatement.upload')}
                </button>
              </div>

              <input
                  ref={inputRef}
                  type="file"
                  accept={fileInputAccept}
                  className="hidden"
                  aria-label={t('bankStatement.selectFileAria')}
                  onChange={(event) => handleFileSelection(event.target.files?.[0] || null)}
              />

              <div className="mt-4 rounded-xl border border-border bg-paper px-4 py-4 text-sm text-ink/65">
                {file ? (
                    <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {file.name}{selectedFormat ? ` • ${selectedFormat.toUpperCase()}` : ''}
                  </span>
                      <button
                          type="button"
                          onClick={handleClearFile}
                          className="shrink-0 rounded-md p-1 text-ink/50 hover:bg-red-50 hover:text-red-600"
                          title={t('bankStatement.removeFileTitle')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                ) : (
                    <>
                      <span className="lg:hidden">{t('bankStatement.noFileSelected')}</span>
                      <span className="hidden lg:inline">
                        {t('bankStatement.dragDrop')}
                      </span>
                    </>
                )}
              </div>

              {error && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
              )}
            </div>
          </section>
        </div>
      </Modal>
  )
}
