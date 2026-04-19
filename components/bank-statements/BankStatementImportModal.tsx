'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, ExternalLink, FileUp, Landmark, Loader2, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BANK_TUTORIALS, BANK_TUTORIALS_BY_ID } from '@/lib/bank-statements/tutorials'
import type {
  BankId,
  ImportPreviewItem,
  ImportPreviewResult,
  ReviewedImportItem,
  StatementFileFormat,
} from '@/lib/bank-statements/types'
import { getAuthBearerToken } from '@/lib/billing/client'
import { MAX_CSV_SIZE_BYTES, MAX_OFX_SIZE_BYTES } from '@/lib/bank-statements/constants'
import type { CategoryRecord } from '@/lib/categories'
import { buildCategoryLabelMap } from '@/lib/categories'

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
  const tutorial = BANK_TUTORIALS_BY_ID[bankId]
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      <img
        src={tutorial.iconUrl}
        alt={`Ícone oficial do app ${tutorial.name}`}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

function getFormatBadge(tutorial: (typeof BANK_TUTORIALS)[number]) {
  if (tutorial.ofxAvailability === 'official') {
    return { label: 'OFX confirmado', className: 'bg-emerald-100 text-emerald-800' }
  }
  if (tutorial.ofxAvailability === 'secondary') {
    return { label: 'OFX provável', className: 'bg-sky-100 text-sky-800' }
  }
  return { label: 'Apenas CSV', className: 'bg-slate-100 text-slate-700' }
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

  const tutorial = useMemo(() => BANK_TUTORIALS_BY_ID[selectedBank], [selectedBank])
  const selectedFormat = detectFormatFromFile(file)
  const supportsOfx = tutorial.supportedImportFormats.includes('ofx')
  const acceptedFormatsLabel = supportsOfx ? 'OFX (preferencial) ou CSV' : 'CSV'
  const fileInputAccept = supportsOfx
    ? '.ofx,application/x-ofx,application/ofx,.csv,text/csv'
    : '.csv,text/csv,application/csv'
  const categoryLabelMap = useMemo(() => buildCategoryLabelMap(categories), [categories])
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
        .select('id,name,kind,parent_id,is_system')
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
    if (!candidate) return 'Selecione um arquivo do extrato.'

    const format = detectFormatFromFile(candidate)
    if (!format) return 'Envie um arquivo CSV ou OFX válido.'
    if (!tutorial.supportedImportFormats.includes(format)) {
      return supportsOfx
        ? `Use OFX ou CSV para ${tutorial.name}.`
        : `Para ${tutorial.name}, use CSV neste fluxo.`
    }
    if (format === 'csv' && candidate.size > MAX_CSV_SIZE_BYTES) return `O CSV excede o limite de ${maxCsvSizeLabel}.`
    if (format === 'ofx' && candidate.size > MAX_OFX_SIZE_BYTES) return `O OFX excede o limite de ${maxOfxSizeLabel}.`
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
      if (!token) throw new Error('Sua sessão expirou. Faça login novamente.')

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
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível analisar o extrato.')

      const previewPayload = payload as ImportPreviewResult
      setPreview(previewPayload)
      setReviewItems(buildInitialReviewItems(previewPayload.items))
    } catch (cause: any) {
      setError(cause?.message || 'Falha ao analisar o extrato.')
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
      if (!token) throw new Error('Sua sessão expirou. Faça login novamente.')

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
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível concluir a importação.')

      setResult(payload as ImportResponse)
      onImported?.()
    } catch (cause: any) {
      setError(cause?.message || 'Falha ao importar o extrato.')
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
      <Modal isOpen={isOpen} onClose={resetAndClose} title="Importação concluída" size="xl">
        <div className="flex h-[78vh] flex-col gap-4 overflow-hidden">
          <div className="rounded-2xl border border-border bg-paper p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-serif text-coffee">Resumo da importação</h4>
                <p className="text-sm text-ink/60">
                  Lote {result.batchId} • {result.format.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={downloadReport}
                className="inline-flex items-center gap-2 rounded-md border border-petrol/25 px-3 py-2 text-sm font-semibold text-petrol hover:bg-petrol/5"
              >
                <Download className="h-4 w-4" />
                Baixar relatório
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-xl bg-bg p-3 text-sm"><strong>{result.summary.totalFound}</strong><br />transações encontradas</div>
              <div className="rounded-xl bg-green-50 p-3 text-sm"><strong>{result.summary.incomesCreated}</strong><br />viraram receitas</div>
              <div className="rounded-xl bg-red-50 p-3 text-sm"><strong>{result.summary.expensesCreated}</strong><br />viraram despesas</div>
              <div className="rounded-xl bg-amber-50 p-3 text-sm"><strong>{result.summary.duplicatesIgnored}</strong><br />ignoradas</div>
              <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>{result.summary.lowConfidenceCount}</strong><br />baixa confiança</div>
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
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {result.preview.map((item) => (
                  <tr key={item.previewKey} className="border-t border-border">
                    <td className="px-3 py-2">{item.date}</td>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2">{item.type === 'income' ? 'Receita' : 'Despesa'}</td>
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
      <Modal isOpen={isOpen} onClose={resetAndClose} title="Revisar importação" size="xl">
        <div className="flex h-[78vh] flex-col gap-4 overflow-hidden">
          <div className="rounded-2xl border border-border bg-paper p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-serif text-coffee">Resumo encontrado no arquivo</h4>
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
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-md bg-petrol px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  Confirmar importação
                </button>
              </div>
            </div>

            {reviewSummary && (
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl bg-bg p-3 text-sm"><strong>{reviewSummary.totalFound}</strong><br />encontradas</div>
                <div className="rounded-xl bg-green-50 p-3 text-sm"><strong>{reviewSummary.incomesReviewed}</strong><br />receitas</div>
                <div className="rounded-xl bg-red-50 p-3 text-sm"><strong>{reviewSummary.expensesReviewed}</strong><br />despesas</div>
                <div className="rounded-xl bg-amber-50 p-3 text-sm"><strong>{reviewSummary.ignoredCount}</strong><br />ignoradas</div>
                <div className="rounded-xl bg-blue-50 p-3 text-sm"><strong>{reviewSummary.lowConfidenceCount}</strong><br />baixa confiança</div>
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
                  <th className="px-3 py-2">Ignorar</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Categoria</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Sinais</th>
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
                        />
                      </td>
                      <td className="px-3 py-3 text-ink/80">{item.date}</td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={review?.description || item.description}
                          onChange={(event) => updateReviewItem(item.previewKey, { description: event.target.value })}
                          className="w-full min-w-[260px] rounded-md border border-border bg-bg px-3 py-2 text-sm"
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
                          <option value="income">Receita</option>
                          <option value="expense">Despesa</option>
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
                          <option value="">Importado de extrato</option>
                          {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {categoryLabelMap.get(category.id) || category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 font-semibold text-sidebar">{formatCurrency(item.amount)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.isDuplicate && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                              {item.duplicateReason === 'database' ? 'Duplicada no banco' : 'Duplicada no arquivo'}
                            </span>
                          )}
                          {item.lowConfidence && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                              {Math.round(item.confidence * 100)}% confiança
                            </span>
                          )}
                          {!item.isDuplicate && !item.lowConfidence && (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                              Revisão simples
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
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Importar Extrato Bancário">
      <div className="space-y-5">
        <p className="text-sm text-ink/65">
          Selecione seu banco e faça upload do arquivo OFX ou CSV exportado pelo aplicativo do banco.
        </p>

        {/* Bank selector */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Banco</label>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value as BankId)}
            className="w-full px-4 py-3 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/30 text-ink text-sm"
          >
            {BANK_TUTORIALS.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelection(e.dataTransfer.files?.[0] || null) }}
          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-vintage ${
            dragging ? 'border-petrol bg-petrol/5' : 'border-border bg-offWhite'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-between gap-3 text-left">
              <span className="min-w-0 truncate text-sm text-ink">
                {file.name}{selectedFormat ? ` · ${selectedFormat.toUpperCase()}` : ''}
              </span>
              <button
                type="button"
                onClick={handleClearFile}
                className="shrink-0 rounded-md p-1 text-ink/50 hover:bg-red-50 hover:text-red-600"
                title="Remover arquivo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Download className="h-8 w-8 text-ink/30 mx-auto mb-3" />
              <p className="text-sm text-ink/60 mb-3">Arraste o arquivo aqui ou</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-5 py-2 border border-petrol/40 text-petrol rounded-lg text-sm font-medium hover:bg-petrol/5 transition-vintage"
              >
                Escolher arquivo
              </button>
              <p className="mt-3 text-xs text-ink/40">OFX ou CSV · máx. 5 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={fileInputAccept}
            className="hidden"
            onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={resetAndClose}
            className="flex-1 px-4 py-3 border border-border rounded-lg text-sm hover:bg-paper transition-vintage"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || loading}
            className="flex-1 px-4 py-3 bg-petrol text-white rounded-lg text-sm font-semibold hover:bg-petrol/90 disabled:opacity-50 transition-vintage inline-flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar
          </button>
        </div>
      </div>
    </Modal>
  )
}
