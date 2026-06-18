import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { OfxStatementParser } from '@/lib/bank-statements/OfxStatementParser'
import { CsvStatementParser } from '@/lib/bank-statements/CsvStatementParser'
import type { AppLocale } from '@/lib/i18n/getLocale'
import type {
  BankId,
  ImportPreviewItem,
  ImportPreviewResult,
  ImportPreviewSummary,
  ImportResult,
  ParsedStatementTransaction,
  ReviewedImportItem,
  StatementFileFormat,
} from '@/lib/bank-statements/types'
import type { Database, Json } from '@/types/database'
import {
  inferExpensePaymentMethod,
} from '@/lib/bank-statements/utils'
import { buildFileHash, buildTransactionHash } from '@/lib/bank-statements/server-utils'
import { notifyWidgetSync } from '@/lib/notifications/widgetSync'
import {
  LOW_CONFIDENCE_THRESHOLD,
  MAX_CSV_SIZE_BYTES,
  MAX_OFX_SIZE_BYTES,
  CSV_IMPORT_SOURCE,
  CSV_IMPORT_SOURCE_TYPE,
  OFX_IMPORT_SOURCE,
  OFX_IMPORT_SOURCE_TYPE,
  STATEMENT_IMPORT_CATEGORY_NAME,
} from '@/lib/bank-statements/constants'

type Supabase = SupabaseClient<Database>

interface ImportRequest {
  bank: BankId
  format: StatementFileFormat
  file: Buffer
  fileName: string
  familyId: string
  userId: string
  locale?: AppLocale
}

// ─── User-facing strings (errors/warnings surfaced in the import review UI) ──
// Plain in-file translation table (no async/React context here, same approach
// as lib/mailer.ts / lib/forecast/narrator.ts elsewhere in the app).
const STRINGS: Record<AppLocale, {
  createBatch: string
  createTechCategory: string
  loadTechCategories: string
  saveExpenses: string
  saveIncomes: string
  validateCategories: string
  duplicateFile: string
  reviewKeyMismatch: string
  invalidCategory: string
  invalidCategoryKind: string
  noTransactionsFound: string
  categoryResolutionFailed: string
  emptyDescription: string
  duplicatesIgnoredWarning: (count: number) => string
  lowConfidenceSavedWarning: (count: number) => string
  duplicatesDetectedWarning: (count: number) => string
  lowConfidenceReviewWarning: (count: number) => string
}> = {
  'pt-BR': {
    createBatch: 'Não foi possível criar o lote de importação.',
    createTechCategory: 'Não foi possível criar a categoria técnica da importação.',
    loadTechCategories: 'Não foi possível carregar as categorias técnicas da importação.',
    saveExpenses: 'Não foi possível gravar as despesas importadas.',
    saveIncomes: 'Não foi possível gravar as receitas importadas.',
    validateCategories: 'Não foi possível validar as categorias escolhidas na revisão.',
    duplicateFile: 'Este arquivo já foi importado para esta família.',
    reviewKeyMismatch: 'A revisão enviada não corresponde ao arquivo analisado.',
    invalidCategory: 'Uma das categorias escolhidas não pertence à família atual.',
    invalidCategoryKind: 'A categoria escolhida não corresponde ao tipo do lançamento.',
    noTransactionsFound: 'Nenhuma movimentação foi reconhecida nesse arquivo.',
    categoryResolutionFailed: 'A categoria técnica de importação não pôde ser resolvida.',
    emptyDescription: 'A descrição revisada não pode ficar vazia.',
    duplicatesIgnoredWarning: (count) =>
      count === 1 ? '1 lançamento foi ignorado por duplicidade.' : `${count} lançamentos foram ignorados por duplicidade.`,
    lowConfidenceSavedWarning: (count) =>
      count === 1 ? '1 lançamento foi gravado com baixa confiança.' : `${count} lançamentos foram gravados com baixa confiança.`,
    duplicatesDetectedWarning: (count) =>
      count === 1
        ? '1 lançamento parece duplicado e começará marcado para ignorar.'
        : `${count} lançamentos parecem duplicados e começarão marcados para ignorar.`,
    lowConfidenceReviewWarning: (count) =>
      count === 1 ? '1 lançamento exige revisão por baixa confiança.' : `${count} lançamentos exigem revisão por baixa confiança.`,
  },
  en: {
    createBatch: 'Unable to create the import batch.',
    createTechCategory: 'Unable to create import technical category.',
    loadTechCategories: 'Unable to load import technical categories.',
    saveExpenses: 'Unable to save imported expenses.',
    saveIncomes: 'Unable to save imported income records.',
    validateCategories: 'Unable to validate the selected categories.',
    duplicateFile: 'This file has already been imported for this family.',
    reviewKeyMismatch: "The submitted review doesn't match the analyzed file.",
    invalidCategory: "One of the chosen categories doesn't belong to the current family.",
    invalidCategoryKind: "The chosen category doesn't match the transaction type.",
    noTransactionsFound: 'No transactions were recognized in this file.',
    categoryResolutionFailed: "The import's technical category couldn't be resolved.",
    emptyDescription: "The reviewed description can't be empty.",
    duplicatesIgnoredWarning: (count) =>
      count === 1 ? '1 transaction was ignored due to duplication.' : `${count} transactions were ignored due to duplication.`,
    lowConfidenceSavedWarning: (count) =>
      count === 1 ? '1 transaction was saved with low confidence.' : `${count} transactions were saved with low confidence.`,
    duplicatesDetectedWarning: (count) =>
      count === 1
        ? '1 transaction looks like a duplicate and will start marked to ignore.'
        : `${count} transactions look like duplicates and will start marked to ignore.`,
    lowConfidenceReviewWarning: (count) =>
      count === 1 ? '1 transaction requires review due to low confidence.' : `${count} transactions require review due to low confidence.`,
  },
  es: {
    createBatch: 'No se pudo crear el lote de importación.',
    createTechCategory: 'No se pudo crear la categoría técnica de importación.',
    loadTechCategories: 'No se pudieron cargar las categorías técnicas de importación.',
    saveExpenses: 'No se pudieron guardar los gastos importados.',
    saveIncomes: 'No se pudieron guardar los ingresos importados.',
    validateCategories: 'No se pudieron validar las categorías seleccionadas.',
    duplicateFile: 'Este archivo ya fue importado para esta familia.',
    reviewKeyMismatch: 'La revisión enviada no corresponde al archivo analizado.',
    invalidCategory: 'Una de las categorías elegidas no pertenece a la familia actual.',
    invalidCategoryKind: 'La categoría elegida no corresponde al tipo de transacción.',
    noTransactionsFound: 'No se reconoció ningún movimiento en este archivo.',
    categoryResolutionFailed: 'No se pudo resolver la categoría técnica de la importación.',
    emptyDescription: 'La descripción revisada no puede quedar vacía.',
    duplicatesIgnoredWarning: (count) =>
      count === 1 ? '1 transacción fue ignorada por duplicidad.' : `${count} transacciones fueron ignoradas por duplicidad.`,
    lowConfidenceSavedWarning: (count) =>
      count === 1 ? '1 transacción fue guardada con baja confianza.' : `${count} transacciones fueron guardadas con baja confianza.`,
    duplicatesDetectedWarning: (count) =>
      count === 1
        ? '1 transacción parece duplicada y comenzará marcada para ignorar.'
        : `${count} transacciones parecen duplicadas y comenzarán marcadas para ignorar.`,
    lowConfidenceReviewWarning: (count) =>
      count === 1 ? '1 transacción requiere revisión por baja confianza.' : `${count} transacciones requieren revisión por baja confianza.`,
  },
}

interface AnalyzedImportItem {
  previewKey: string
  amountCents: number
  importHash: string
  duplicateInFile: boolean
  duplicateInDatabase: boolean
  item: ParsedStatementTransaction
}

interface CommitRequest extends ImportRequest {
  reviewedItems: ReviewedImportItem[]
}

export class BankStatementImportError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'import_error',
    public readonly details?: string
  ) {
    super(message)
  }
}

export class BankStatementImportService {
  constructor(
    private readonly db: Supabase = supabaseAdmin,
  ) {}

  async preview(request: ImportRequest): Promise<ImportPreviewResult> {
    const strings = STRINGS[request.locale ?? 'pt-BR']
    const analyzed = await this.analyzeImport(request, strings)

    return {
      bank: request.bank,
      format: request.format,
      fileHash: analyzed.fileHash,
      pageCount: 0,
      summary: analyzed.summary,
      warnings: analyzed.warnings,
      items: buildImportPreview(analyzed.items),
    }
  }

  async import(request: ImportRequest): Promise<ImportResult> {
    const preview = await this.preview(request)
    const reviewedItems = preview.items.map<ReviewedImportItem>((item) => ({
      previewKey: item.previewKey,
      description: item.description,
      type: item.type,
      categoryId: null,
      ignore: item.isDuplicate,
    }))

    return this.commit({
      ...request,
      reviewedItems,
    })
  }

	  async commit(request: CommitRequest): Promise<ImportResult> {
	    const strings = STRINGS[request.locale ?? 'pt-BR']
	    const analyzed = await this.analyzeImport(request, strings)
	    const batchId = globalThis.crypto.randomUUID()
	    const importedAt = new Date().toISOString()

    const { error: batchInsertError } = await this.db.from('bank_statement_import_batches').insert({
      id: batchId,
      family_id: request.familyId,
      user_id: request.userId,
      source_bank: request.bank,
      source_type: request.format === 'ofx' ? OFX_IMPORT_SOURCE_TYPE : CSV_IMPORT_SOURCE_TYPE,
      file_name: request.fileName,
      file_hash: analyzed.fileHash,
      page_count: 0,
      status: 'processing',
    })

    if (batchInsertError) {
      if (
        batchInsertError.code === '23505' ||
        batchInsertError.message.includes('bank_statement_import_batches_family_file_hash_unique_idx')
      ) {
        throw new BankStatementImportError(
          strings.duplicateFile,
          409,
          'duplicate_file',
          batchInsertError.message
        )
      }

      throw new BankStatementImportError(
        strings.createBatch,
        500,
        'batch_create_failed',
        batchInsertError.message
      )
    }

    const reviewedByKey = new Map(request.reviewedItems.map((item) => [item.previewKey, item]))
    const validReviewKeys = new Set(analyzed.items.map((item) => item.previewKey))
    const unknownReviewKey = request.reviewedItems.find((item) => !validReviewKeys.has(item.previewKey))
    if (unknownReviewKey) {
      throw new BankStatementImportError(strings.reviewKeyMismatch, 422, 'review_key_mismatch')
    }

    const selectedCategoryIds: string[] = []
    for (const item of request.reviewedItems) {
      if (item.categoryId) {
        selectedCategoryIds.push(item.categoryId)
      }
    }
    const availableCategories = await this.loadCategoriesByIds(request.familyId, selectedCategoryIds, strings)

    const committedItems = analyzed.items.flatMap((entry) => {
      const review = reviewedByKey.get(entry.previewKey)
      const shouldIgnore = review?.ignore ?? (entry.duplicateInFile || entry.duplicateInDatabase)

      if (shouldIgnore) {
        return []
      }

      const nextType = review?.type ?? entry.item.type
      const nextDescription = this.sanitizeDescription(review?.description?.trim() ? review.description : entry.item.description, strings)
      const selectedCategory = review?.categoryId ? availableCategories.get(review.categoryId) : null

      if (review?.categoryId && !selectedCategory) {
        throw new BankStatementImportError(strings.invalidCategory, 422, 'invalid_category')
      }

      if (selectedCategory && selectedCategory.kind !== nextType) {
        throw new BankStatementImportError(strings.invalidCategoryKind, 422, 'invalid_category_kind')
      }

      return [{
        ...entry,
        item: {
          ...entry.item,
          description: nextDescription,
          type: nextType,
        },
        importHash: buildTransactionHash({
          familyId: request.familyId,
          date: entry.item.date,
          description: nextDescription,
          amountCents: entry.amountCents,
          type: nextType,
          sourceBank: request.bank,
        }),
        selectedCategoryId: selectedCategory?.id || null,
        selectedCategoryName: selectedCategory?.name || null,
      }]
    })
    const categories = await this.ensureImportCategories(request.familyId, strings)

    const incomeRows: Database['public']['Tables']['incomes']['Insert'][] = []
    const expenseRows: Database['public']['Tables']['expenses']['Insert'][] = []
    for (const item of committedItems) {
      if (item.item.type === 'income') {
        incomeRows.push({
          family_id: request.familyId,
          category_id: item.selectedCategoryId || categories.incomeId,
          category_name: item.selectedCategoryName || STATEMENT_IMPORT_CATEGORY_NAME,
          description: item.item.description,
          amount_cents: item.amountCents,
          date: item.item.date,
          status: 'received',
          notes: null,
          source: request.format === 'ofx' ? OFX_IMPORT_SOURCE : CSV_IMPORT_SOURCE,
          source_type: request.format === 'ofx' ? OFX_IMPORT_SOURCE_TYPE : CSV_IMPORT_SOURCE_TYPE,
          source_bank: request.bank,
          imported_at: importedAt,
          import_batch_id: batchId,
          raw_description: item.item.rawDescription,
          raw_line: item.item.rawLine,
          raw_payload: item.item.rawPayload,
          import_hash: item.importHash,
          low_confidence: item.item.confidence < LOW_CONFIDENCE_THRESHOLD,
        })
        continue
      }

      expenseRows.push({
        family_id: request.familyId,
        category_id: item.selectedCategoryId || categories.expenseId,
        category_name: item.selectedCategoryName || STATEMENT_IMPORT_CATEGORY_NAME,
        description: item.item.description,
        amount_cents: item.amountCents,
        date: item.item.date,
        status: 'paid',
        paid_at: importedAt,
        notes: null,
        payment_method: inferExpensePaymentMethod(item.item.description),
        installments: 1,
        source: request.format === 'ofx' ? OFX_IMPORT_SOURCE : CSV_IMPORT_SOURCE,
        source_type: request.format === 'ofx' ? OFX_IMPORT_SOURCE_TYPE : CSV_IMPORT_SOURCE_TYPE,
        source_bank: request.bank,
        imported_at: importedAt,
        import_batch_id: batchId,
        raw_description: item.item.rawDescription,
        raw_line: item.item.rawLine,
        raw_payload: item.item.rawPayload,
        import_hash: item.importHash,
        low_confidence: item.item.confidence < LOW_CONFIDENCE_THRESHOLD,
      })
    }

    let insertedIncomeCount = 0
    if (incomeRows.length) {
      const result = await this.insertRowsIgnoringDuplicates('incomes', incomeRows)
      if (result.error) {
        throw new BankStatementImportError(
          strings.saveIncomes,
          500,
          'income_insert_failed',
          result.error.message
        )
      }
      insertedIncomeCount = result.insertedCount
    }

    let insertedExpenseCount = 0
    if (expenseRows.length) {
      const result = await this.insertRowsIgnoringDuplicates('expenses', expenseRows)
      if (result.error) {
        throw new BankStatementImportError(
          strings.saveExpenses,
          500,
          'expense_insert_failed',
          result.error.message
        )
      }
      insertedExpenseCount = result.insertedCount
    }

    const summary = {
      totalFound: analyzed.items.length,
      incomesCreated: insertedIncomeCount,
      expensesCreated: insertedExpenseCount,
      duplicatesIgnored: analyzed.summary.duplicatesDetected + (incomeRows.length - insertedIncomeCount) + (expenseRows.length - insertedExpenseCount),
      lowConfidenceCount: committedItems.filter((item) => item.item.confidence < LOW_CONFIDENCE_THRESHOLD).length,
    }

    const warnings: string[] = []
    if (summary.duplicatesIgnored > 0) {
      warnings.push(strings.duplicatesIgnoredWarning(summary.duplicatesIgnored))
    }
    if (summary.lowConfidenceCount > 0) {
      warnings.push(strings.lowConfidenceSavedWarning(summary.lowConfidenceCount))
    }

    await this.db
      .from('bank_statement_import_batches')
      .update({
        status: summary.totalFound === summary.duplicatesIgnored ? 'completed_with_duplicates' : 'completed',
        summary: summary as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)

    if (insertedIncomeCount > 0 || insertedExpenseCount > 0) {
      void notifyWidgetSync(request.familyId)
    }

    return {
      batchId,
      fileHash: analyzed.fileHash,
      bank: request.bank,
      format: request.format,
      pageCount: 0,
      summary,
      warnings,
      items: committedItems.map((item) => item.item),
    }
  }

  private async analyzeImport(request: ImportRequest, strings: typeof STRINGS[AppLocale]) {
    const { items, parserWarnings } = this.extractTransactions(request)

    if (!items.length) {
      throw new BankStatementImportError(strings.noTransactionsFound, 422, 'no_transactions_found')
    }

    const countsByHash = new Map<string, number>()
    const analyzed = items.map<AnalyzedImportItem>((item, index) => {
      const amountCents = Math.round(item.amount * 100)
      const importHash = buildTransactionHash({
        familyId: request.familyId,
        date: item.date,
        description: item.description,
        amountCents,
        type: item.type,
        sourceBank: request.bank,
      })
      countsByHash.set(importHash, (countsByHash.get(importHash) || 0) + 1)

      return {
        previewKey: `${index}:${importHash}`,
        amountCents,
        importHash,
        duplicateInFile: false,
        duplicateInDatabase: false,
        item,
      }
    })

    for (const entry of analyzed) {
      entry.duplicateInFile = (countsByHash.get(entry.importHash) || 0) > 1
    }

    const existingHashes = await this.findExistingHashes(
      request.familyId,
      [...new Set(analyzed.map((item) => item.importHash))]
    )

    for (const entry of analyzed) {
      entry.duplicateInDatabase = existingHashes.has(entry.importHash)
    }

    const summary: ImportPreviewSummary = {
      totalFound: analyzed.length,
      incomesDetected: analyzed.filter((item) => item.item.type === 'income').length,
      expensesDetected: analyzed.filter((item) => item.item.type === 'expense').length,
      duplicatesDetected: analyzed.filter((item) => item.duplicateInFile || item.duplicateInDatabase).length,
      lowConfidenceCount: analyzed.filter((item) => item.item.confidence < LOW_CONFIDENCE_THRESHOLD).length,
    }

    const warnings: string[] = [...parserWarnings]
    if (summary.duplicatesDetected > 0) {
      warnings.push(strings.duplicatesDetectedWarning(summary.duplicatesDetected))
    }
    if (summary.lowConfidenceCount > 0) {
      warnings.push(strings.lowConfidenceReviewWarning(summary.lowConfidenceCount))
    }

    return {
      fileHash: buildFileHash(request.file),
      items: analyzed,
      summary,
      warnings,
    }
  }

  private extractTransactions(request: ImportRequest): { items: ParsedStatementTransaction[]; parserWarnings: string[] } {
    const content = request.file.toString('utf-8')
    const locale = request.locale ?? 'pt-BR'

    if (request.format === 'ofx') {
      const parsed = new OfxStatementParser(request.bank, locale).parse(content)
      return { items: parsed.items, parserWarnings: parsed.warnings }
    }

    const parsed = new CsvStatementParser(request.bank, locale).parse(content)
    return { items: parsed.items, parserWarnings: parsed.warnings }
  }

  private async ensureImportCategories(familyId: string, strings: typeof STRINGS[AppLocale]) {
    const { data, error } = await this.db
      .from('categories')
      .select('id,kind,name')
      .eq('family_id', familyId)
      .in('name', [STATEMENT_IMPORT_CATEGORY_NAME, 'Importado de PDF'])

    if (error) {
      throw new BankStatementImportError(
        strings.loadTechCategories,
        500,
        'category_lookup_failed',
        error.message
      )
    }

    let incomeId = data?.find((item) => item.kind === 'income')?.id
    let expenseId = data?.find((item) => item.kind === 'expense')?.id

    const toCreate: Array<{ family_id: string; kind: 'income' | 'expense'; name: string; is_system: boolean }> = []
    if (!incomeId) toCreate.push({ family_id: familyId, kind: 'income', name: STATEMENT_IMPORT_CATEGORY_NAME, is_system: true })
    if (!expenseId) toCreate.push({ family_id: familyId, kind: 'expense', name: STATEMENT_IMPORT_CATEGORY_NAME, is_system: true })

    if (toCreate.length) {
      const { data: created, error: createError } = await this.db.from('categories').insert(toCreate).select('id,kind')
      if (createError) {
        throw new BankStatementImportError(
          strings.createTechCategory,
          500,
          'category_create_failed',
          createError.message
        )
      }

      incomeId = incomeId || created?.find((item) => item.kind === 'income')?.id
      expenseId = expenseId || created?.find((item) => item.kind === 'expense')?.id
    }

    if (!incomeId || !expenseId) {
      throw new BankStatementImportError(strings.categoryResolutionFailed, 500, 'category_resolution_failed')
    }

    return { incomeId, expenseId }
  }

  private async loadCategoriesByIds(familyId: string, categoryIds: string[], strings: typeof STRINGS[AppLocale]) {
    if (!categoryIds.length) {
      return new Map<string, { id: string; kind: 'income' | 'expense'; name: string }>()
    }

    const { data, error } = await this.db
      .from('categories')
      .select('id,kind,name')
      .eq('family_id', familyId)
      .in('id', categoryIds)

    if (error) {
      throw new BankStatementImportError(
        strings.validateCategories,
        500,
        'category_review_lookup_failed',
        error.message
      )
    }

    return new Map((data || []).map((item) => [item.id, { id: item.id, kind: item.kind as 'income' | 'expense', name: item.name }]))
  }

  private async findExistingHashes(familyId: string, hashes: string[]) {
    if (!hashes.length) return new Set<string>()

    const [incomeResult, expenseResult] = await Promise.all([
      this.db.from('incomes').select('import_hash').eq('family_id', familyId).in('import_hash', hashes),
      this.db.from('expenses').select('import_hash').eq('family_id', familyId).in('import_hash', hashes),
    ])

    const existing = new Set<string>()
    for (const row of incomeResult.data || []) {
      if (row.import_hash) existing.add(row.import_hash)
    }
    for (const row of expenseResult.data || []) {
      if (row.import_hash) existing.add(row.import_hash)
    }

    return existing
  }

  private async insertRowsIgnoringDuplicates(
    table: 'incomes' | 'expenses',
    rows: Array<Database['public']['Tables']['incomes']['Insert'] | Database['public']['Tables']['expenses']['Insert']>
  ) {
    let insertedCount = 0

    for (const row of rows) {
      const { error } = await this.db.from(table).insert(row as never)
      if (!error) {
        insertedCount += 1
        continue
      }

      const isDuplicateImportHash =
        error.code === '23505' ||
        error.message.includes('duplicate key value violates unique constraint') ||
        error.message.includes('idx_incomes_family_import_hash') ||
        error.message.includes('idx_expenses_family_import_hash')

      if (isDuplicateImportHash) {
        continue
      }

      return { insertedCount, error }
    }

    return { insertedCount, error: null as { message: string; code?: string } | null }
  }

  private sanitizeDescription(value: string, strings: typeof STRINGS[AppLocale]) {
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized) {
      throw new BankStatementImportError(strings.emptyDescription, 422, 'invalid_review_description')
    }

    return normalized
  }
}

export const buildImportPreview = (items: AnalyzedImportItem[]): ImportPreviewItem[] =>
  items.map((item) => ({
    previewKey: item.previewKey,
    date: item.item.date,
    description: item.item.description,
    amount: item.item.amount,
    type: item.item.type,
    confidence: item.item.confidence,
    lowConfidence: item.item.confidence < LOW_CONFIDENCE_THRESHOLD,
    isDuplicate: item.duplicateInFile || item.duplicateInDatabase,
    duplicateReason: item.duplicateInDatabase ? 'database' : item.duplicateInFile ? 'file' : 'none',
    categoryId: null,
    ignore: item.duplicateInFile || item.duplicateInDatabase,
  }))
