import type { AppLocale } from '@/lib/i18n/getLocale'
import type { BankId, ParsedStatementTransaction } from '@/lib/bank-statements/types'
import { clampConfidence, detectTransactionType, normalizeFreeText } from '@/lib/bank-statements/utils'

type UnsupportedOfxReasonCode = 'xfer' | 'investment' | 'pix_credit_reserve' | 'internal_transfer'

// ─── User-facing strings (warnings shown in the import review UI) ────────────
// Plain in-file translation table (no async/React context here, same approach
// as lib/mailer.ts / lib/forecast/narrator.ts elsewhere in the app).
const STRINGS: Record<AppLocale, {
  ofxFallbackDescription: string
  skipReasonLabel: Record<UnsupportedOfxReasonCode, string>
  ofxSkippedWarning: (count: number, reason: string) => string
}> = {
  'pt-BR': {
    ofxFallbackDescription: 'Lançamento OFX',
    skipReasonLabel: {
      xfer: 'transferência interna',
      investment: 'movimentação de investimento ou reserva',
      pix_credit_reserve: 'reserva de crédito para pagamento via Pix (coberta pela despesa correspondente)',
      internal_transfer: 'movimentação interna entre contas',
    },
    ofxSkippedWarning: (count, reason) =>
      count === 1
        ? `1 lançamento OFX foi ignorado por parecer ${reason}.`
        : `${count} lançamentos OFX foram ignorados por parecerem ${reason}.`,
  },
  en: {
    ofxFallbackDescription: 'OFX transaction',
    skipReasonLabel: {
      xfer: 'an internal transfer',
      investment: 'an investment or savings reserve transaction',
      pix_credit_reserve: 'a credit reserve for a Pix payment (covered by the corresponding expense)',
      internal_transfer: 'an internal transfer between accounts',
    },
    ofxSkippedWarning: (count, reason) =>
      count === 1
        ? `1 OFX transaction was ignored for appearing to be ${reason}.`
        : `${count} OFX transactions were ignored for appearing to be ${reason}.`,
  },
  es: {
    ofxFallbackDescription: 'Transacción OFX',
    skipReasonLabel: {
      xfer: 'una transferencia interna',
      investment: 'un movimiento de inversión o reserva',
      pix_credit_reserve: 'una reserva de crédito para pago vía Pix (cubierta por el gasto correspondiente)',
      internal_transfer: 'un movimiento interno entre cuentas',
    },
    ofxSkippedWarning: (count, reason) =>
      count === 1
        ? `1 transacción OFX fue ignorada por parecer ${reason}.`
        : `${count} transacciones OFX fueron ignoradas por parecer ${reason}.`,
  },
}

const blockPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
const INVESTMENT_SKIP_KEYWORDS = [
  'rdb',
  'cdb',
  'caixinha',
  'invest',
  'aplicacao',
  'aplicação',
  'resgate',
  'poupanca',
  'poupança',
  'tesouro',
  'fundo',
  'reserva',
]
const INTERNAL_TRANSFER_SKIP_KEYWORDS = [
  'transferencia interna',
  'transferência interna',
  'entre contas',
  'movimentacao interna',
  'movimentação interna',
  'ajuste de saldo',
]

export interface OfxParseResult {
  items: ParsedStatementTransaction[]
  warnings: string[]
}

function extractTag(block: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i')
  return block.match(regex)?.[1]?.trim() || null
}

function parseOfxDate(value: string | null) {
  if (!value) return null
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length < 8) return null
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function parseAmount(value: string | null) {
  if (!value) return 0
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function classifyOfxType(trnType: string | null, amount: number, description: string, raw: string) {
  const normalized = (trnType || '').toUpperCase()

  if (['DEBIT', 'PAYMENT', 'FEE', 'ATM', 'POS', 'CHECK', 'DIRECTDEBIT'].includes(normalized)) {
    return { type: 'expense' as const, confidence: 0.99 }
  }

  if (['CREDIT', 'DEP', 'DIRECTDEP', 'INT', 'DIV', 'CASH'].includes(normalized)) {
    return { type: 'income' as const, confidence: 0.99 }
  }

  if (amount < 0) {
    return { type: 'expense' as const, confidence: 0.95 }
  }

  if (amount > 0) {
    return { type: 'income' as const, confidence: 0.95 }
  }

  return detectTransactionType(description, raw)
}

function detectUnsupportedOfxReason(trnType: string | null, description: string, raw: string): UnsupportedOfxReasonCode | null {
  const normalizedType = (trnType || '').toUpperCase()
  const haystack = normalizeFreeText(`${description} ${raw}`)

  if (normalizedType === 'XFER') {
    return 'xfer'
  }

  if (INVESTMENT_SKIP_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'investment'
  }

  if (haystack.includes('valor adicionado na conta')) {
    return 'pix_credit_reserve'
  }

  if (INTERNAL_TRANSFER_SKIP_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'internal_transfer'
  }

  return null
}

export class OfxStatementParser {
  constructor(private readonly bank: BankId, private readonly locale: AppLocale = 'pt-BR') {}

  parse(content: string): OfxParseResult {
    const strings = STRINGS[this.locale]

    const items: ParsedStatementTransaction[] = []
    const ignoredReasons = new Map<UnsupportedOfxReasonCode, number>()

    for (const match of content.matchAll(blockPattern)) {
      const block = match[1]
      const postedAt = parseOfxDate(extractTag(block, 'DTPOSTED'))
      const trnType = extractTag(block, 'TRNTYPE')
      const memo = extractTag(block, 'MEMO')
      const name = extractTag(block, 'NAME')
      const fitId = extractTag(block, 'FITID')
      const amount = parseAmount(extractTag(block, 'TRNAMT'))
      const balance = parseAmount(extractTag(block, 'BALAMT'))
      const description = [name, memo].filter(Boolean).join(' - ').trim() || strings.ofxFallbackDescription

      if (!postedAt || !amount || !description) {
        continue
      }

      const unsupportedReason = detectUnsupportedOfxReason(trnType, description, block)
      if (unsupportedReason) {
        ignoredReasons.set(unsupportedReason, (ignoredReasons.get(unsupportedReason) || 0) + 1)
        continue
      }

      const classification = classifyOfxType(trnType, amount, description, block)

      items.push({
        date: postedAt,
        description,
        amount: Math.abs(amount),
        type: classification.type,
        balance: balance || null,
        confidence: clampConfidence(classification.confidence),
        bank: this.bank,
        rawText: block.trim(),
        rawDescription: description,
        rawLine: block.trim(),
        rawPayload: {
          fitId,
          trnType,
          amount,
          memo,
          name,
        },
      })
    }

    const warnings = [...ignoredReasons.entries()].map(([reason, count]) =>
      strings.ofxSkippedWarning(count, strings.skipReasonLabel[reason])
    )

    return { items, warnings }
  }
}
