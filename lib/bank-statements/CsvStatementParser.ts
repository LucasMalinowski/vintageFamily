import type { BankId, ParsedStatementTransaction } from '@/lib/bank-statements/types'
import { clampConfidence, detectTransactionType, normalizeFreeText } from '@/lib/bank-statements/utils'

// ─── Shared skip keywords (same logic as OfxStatementParser) ─────────────────

const INVESTMENT_SKIP_KEYWORDS = [
  'rdb', 'cdb', 'caixinha', 'invest', 'aplicacao', 'aplicacao',
  'resgate', 'poupanca', 'poupanca', 'tesouro', 'fundo', 'reserva',
]
const INTERNAL_TRANSFER_SKIP_KEYWORDS = [
  'transferencia interna', 'entre contas',
  'movimentacao interna', 'ajuste de saldo',
]

// ─── Bank-specific CSV profiles ───────────────────────────────────────────────
// Encodes only what differs per bank: delimiter and number locale.
// Column semantics are auto-detected from headers (see alias tables below).

interface CsvProfile {
  /** Field delimiter, or 'auto' to sniff from the header row. */
  delimiter: ',' | ';' | 'auto'
  /**
   * Number locale used for amounts in this bank's export:
   *  'br'   → 1.250,90  (period = thousands separator, comma = decimal)
   *  'en'   → 1250.90   (no thousands separator, period = decimal)
   *  'auto' → detected from first numeric cell in the file
   */
  numberLocale: 'br' | 'en' | 'auto'
}

const PROFILES: Record<BankId, CsvProfile> = {
  nubank:          { delimiter: ',',    numberLocale: 'en'   },
  inter:           { delimiter: ';',    numberLocale: 'br'   },
  c6:              { delimiter: ';',    numberLocale: 'br'   },
  itau:            { delimiter: ';',    numberLocale: 'br'   },
  bradesco:        { delimiter: ';',    numberLocale: 'br'   },
  santander:       { delimiter: ';',    numberLocale: 'br'   },
  banco_do_brasil: { delimiter: ';',    numberLocale: 'br'   },
  caixa:           { delimiter: ';',    numberLocale: 'br'   },
}

// ─── Column-name alias tables (all values must be pre-normalized) ─────────────
// Normalization = NFD + strip combining marks + lowercase + collapse whitespace
// (same as normalizeFreeText from utils.ts)

const DATE_COLS = new Set([
  'data', 'data lancamento', 'data do lancamento', 'data de lancamento',
  'date', 'dt', 'data mov', 'data movimentacao',
  'data de movimento', 'data movto', 'data transacao',
])

// All description-like column names in priority order (first match = desc1, second = desc2)
const DESCRIPTION_COLS = new Set([
  'lancamento', 'historico', 'descricao', 'description', 'memo',
  'discriminacao', 'narrative', 'complemento', 'detalhe', 'detail',
  'origem', 'beneficiario', 'favorecido', 'nome', 'historico/origem',
])

const SIGNED_AMOUNT_COLS = new Set([
  'valor', 'value', 'amount', 'montante', 'vlr', 'vlr.',
  'valor (r$)', 'valor r$', 'valor da transacao', 'movimentacao',
])

const DEBIT_COLS = new Set([
  'debito', 'saida', 'valor debito', 'debit',
  'valor saida', 'debito (r$)', 'deb.', 'saidas',
  'pagamentos', 'gastos',
])

const CREDIT_COLS = new Set([
  'credito', 'entrada', 'valor credito', 'credit',
  'valor entrada', 'credito (r$)', 'cred.', 'entradas', 'recebimentos',
])

const BALANCE_COLS = new Set([
  'saldo', 'balance', 'saldo atual', 'saldo final', 'saldo contabil',
  'saldo disponivel',
])

// ─── Column map resolved from header row ─────────────────────────────────────

interface ColumnMap {
  date: number
  desc1: number
  desc2: number | null      // secondary description, joined with ' - '
  signedAmount: number | null
  debit: number | null
  credit: number | null
  balance: number | null
}

function resolveColumns(headers: string[]): ColumnMap | null {
  const normalized = headers.map(normalizeFreeText)

  const date = normalized.findIndex((h) => DATE_COLS.has(h))
  if (date === -1) return null

  // Collect all description-like columns in order; first = desc1, second = desc2
  const descIndices = normalized
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => DESCRIPTION_COLS.has(h))
    .map(({ i }) => i)

  const desc1 = descIndices[0] ?? -1
  const desc2 = descIndices[1] ?? null

  if (desc1 === -1) return null

  const signedAmount = normalized.findIndex((h) => SIGNED_AMOUNT_COLS.has(h))
  const debit = normalized.findIndex((h) => DEBIT_COLS.has(h))
  const credit = normalized.findIndex((h) => CREDIT_COLS.has(h))
  const balance = normalized.findIndex((h) => BALANCE_COLS.has(h))

  // Need at least one amount source
  const hasSignedAmount = signedAmount !== -1
  const hasDebitCredit = debit !== -1 && credit !== -1

  if (!hasSignedAmount && !hasDebitCredit) return null

  return {
    date,
    desc1,
    desc2: desc2 !== null && desc2 !== desc1 ? desc2 : null,
    signedAmount: hasSignedAmount ? signedAmount : null,
    debit: debit !== -1 ? debit : null,
    credit: credit !== -1 ? credit : null,
    balance: balance !== -1 ? balance : null,
  }
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function detectDelimiter(headerLine: string): ',' | ';' {
  const semicolons = (headerLine.match(/;/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

/** Parse a CSV row respecting RFC-4180 double-quoted fields. */
function parseCsvRow(line: string, delimiter: string): string[] {
  const result: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(field.trim())
      field = ''
    } else {
      field += ch
    }
  }
  result.push(field.trim())
  return result
}

function parseDate(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null

  // DD/MM/YYYY or D/M/YYYY or DD/MM/YY
  const m1 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m1) {
    const year = m1[3].length === 2 ? `20${m1[3]}` : m1[3]
    return `${year}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  }

  // YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

  // DD-MM-YYYY or D-M-YYYY
  const m2 = v.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/)
  if (m2) {
    const year = m2[3].length === 2 ? `20${m2[3]}` : m2[3]
    return `${year}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }

  return null
}

function parseAmount(raw: string, locale: 'br' | 'en'): number {
  const v = raw.trim()
  if (!v || v === '-') return 0

  let normalized: string
  if (locale === 'br') {
    // 1.250,90 → remove thousand-sep dots, replace decimal comma with dot
    normalized = v.replace(/\./g, '').replace(',', '.')
  } else {
    // 1250.90 → remove any comma thousand separators
    normalized = v.replace(/,/g, '')
  }

  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

function detectNumberLocale(
  lines: string[],
  headerIdx: number,
  columns: ColumnMap,
  delimiter: string
): 'br' | 'en' {
  const amountColIdx = columns.signedAmount ?? columns.debit ?? columns.credit
  if (amountColIdx === null) return 'br'

  for (let i = headerIdx + 1; i < Math.min(headerIdx + 6, lines.length); i++) {
    const row = parseCsvRow(lines[i], delimiter)
    const raw = (row[amountColIdx] ?? '').trim()
    if (!raw || raw === '-') continue

    // If the value ends with comma + 2 digits → BR format
    if (/,\d{2}$/.test(raw)) return 'br'
    // If the value ends with period + 2 digits → EN format
    if (/\.\d{2}$/.test(raw)) return 'en'
  }

  return 'br' // safe default for Brazilian banks
}

// ─── Skip logic (investment / internal transfers) ─────────────────────────────

function detectSkipReason(description: string): string | null {
  const haystack = normalizeFreeText(description)
  if (INVESTMENT_SKIP_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return 'movimentação de investimento ou reserva'
  }
  if (INTERNAL_TRANSFER_SKIP_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return 'movimentação interna entre contas'
  }
  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CsvParseResult {
  items: ParsedStatementTransaction[]
  warnings: string[]
}

export class CsvStatementParser {
  private readonly profile: CsvProfile

  constructor(private readonly bank: BankId) {
    this.profile = PROFILES[bank]
  }

  parse(content: string): CsvParseResult {
    const text = stripBom(content)
    const rawLines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (rawLines.length < 2) {
      return { items: [], warnings: ['O arquivo CSV está vazio ou não possui dados suficientes.'] }
    }

    const delimiter: ',' | ';' =
      this.profile.delimiter === 'auto'
        ? detectDelimiter(rawLines[0])
        : this.profile.delimiter

    // Find the header row: scan the first few lines for a recognisable column map
    let headerIdx = -1
    let columns: ColumnMap | null = null

    for (let i = 0; i < Math.min(rawLines.length, 8); i++) {
      const row = parseCsvRow(rawLines[i], delimiter)
      const candidate = resolveColumns(row)
      if (candidate) {
        headerIdx = i
        columns = candidate
        break
      }
    }

    if (!columns || headerIdx === -1) {
      return {
        items: [],
        warnings: [
          'O CSV não possui cabeçalho reconhecível. ' +
          'Verifique se o arquivo é do banco correto e não foi editado manualmente.',
        ],
      }
    }

    const numberLocale: 'br' | 'en' =
      this.profile.numberLocale === 'auto'
        ? detectNumberLocale(rawLines, headerIdx, columns, delimiter)
        : this.profile.numberLocale

    const items: ParsedStatementTransaction[] = []
    const ignoredReasons = new Map<string, number>()

    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const line = rawLines[i]
      const row = parseCsvRow(line, delimiter)

      // Rows shorter than two fields are spacers or section dividers — skip
      if (row.length < 2) continue

      // Skip rows whose date cell doesn't parse (totals, footnotes, etc.)
      const rawDate = row[columns.date] ?? ''
      const date = parseDate(rawDate)
      if (!date) continue

      const part1 = (row[columns.desc1] ?? '').trim()
      const part2 = columns.desc2 !== null ? (row[columns.desc2] ?? '').trim() : ''
      const rawDescription = [part1, part2].filter(Boolean).join(' - ') || 'Lançamento CSV'

      let amount = 0
      let type: 'income' | 'expense'
      let confidence: number

      if (columns.signedAmount !== null) {
        // ── Signed-amount format ──────────────────────────────────────────────
        const raw = row[columns.signedAmount] ?? ''
        const signed = parseAmount(raw, numberLocale)
        if (signed === 0) continue

        amount = Math.abs(signed)
        if (signed > 0) {
          type = 'income'
          confidence = 0.95
        } else {
          type = 'expense'
          confidence = 0.95
        }
      } else {
        // ── Separate debit / credit columns ──────────────────────────────────
        const debitRaw = columns.debit !== null ? (row[columns.debit] ?? '') : ''
        const creditRaw = columns.credit !== null ? (row[columns.credit] ?? '') : ''
        const debitAmt = parseAmount(debitRaw, numberLocale)
        const creditAmt = parseAmount(creditRaw, numberLocale)

        if (creditAmt > 0 && debitAmt === 0) {
          amount = creditAmt
          type = 'income'
          confidence = 0.97
        } else if (debitAmt > 0 && creditAmt === 0) {
          amount = debitAmt
          type = 'expense'
          confidence = 0.97
        } else if (creditAmt === 0 && debitAmt === 0) {
          continue // zero-amount row (e.g. waived fee)
        } else {
          // Both columns populated — shouldn't happen in real bank exports;
          // fall back to keyword detection with reduced confidence
          amount = Math.max(debitAmt, creditAmt)
          const fallback = detectTransactionType(rawDescription, line)
          type = fallback.type
          confidence = clampConfidence(fallback.confidence * 0.7)
        }
      }

      const skipReason = detectSkipReason(rawDescription)
      if (skipReason) {
        ignoredReasons.set(skipReason, (ignoredReasons.get(skipReason) ?? 0) + 1)
        continue
      }

      const balanceRaw = columns.balance !== null ? (row[columns.balance] ?? '') : ''
      const balance = balanceRaw ? parseAmount(balanceRaw, numberLocale) : null

      items.push({
        date,
        description: rawDescription,
        amount,
        type,
        balance: balance || null,
        confidence: clampConfidence(confidence),
        bank: this.bank,
        rawText: line,
        rawDescription,
        rawLine: line,
        rawPayload: { row, delimiter, locale: numberLocale },
      })
    }

    const warnings = [...ignoredReasons.entries()].map(
      ([reason, count]) => `${count} lançamento(s) CSV foram ignorados por parecerem ${reason}.`
    )

    return { items, warnings }
  }
}
