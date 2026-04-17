import type { BankId, ParsedStatementTransaction } from '@/lib/bank-statements/types'
import { clampConfidence, detectTransactionType, normalizeFreeText } from '@/lib/bank-statements/utils'

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

function detectUnsupportedOfxReason(trnType: string | null, description: string, raw: string) {
  const normalizedType = (trnType || '').toUpperCase()
  const haystack = normalizeFreeText(`${description} ${raw}`)

  if (normalizedType === 'XFER') {
    return 'transferência interna'
  }

  if (INVESTMENT_SKIP_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'movimentação de investimento ou reserva'
  }

  if (haystack.includes('valor adicionado na conta')) {
    return 'reserva de crédito para pagamento via Pix (coberta pela despesa correspondente)'
  }

  if (INTERNAL_TRANSFER_SKIP_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return 'movimentação interna entre contas'
  }

  return null
}

export class OfxStatementParser {
  constructor(private readonly bank: BankId) {}

  parse(content: string): OfxParseResult {
    const items: ParsedStatementTransaction[] = []
    const ignoredReasons = new Map<string, number>()

    for (const match of content.matchAll(blockPattern)) {
      const block = match[1]
      const postedAt = parseOfxDate(extractTag(block, 'DTPOSTED'))
      const trnType = extractTag(block, 'TRNTYPE')
      const memo = extractTag(block, 'MEMO')
      const name = extractTag(block, 'NAME')
      const fitId = extractTag(block, 'FITID')
      const amount = parseAmount(extractTag(block, 'TRNAMT'))
      const balance = parseAmount(extractTag(block, 'BALAMT'))
      const description = [name, memo].filter(Boolean).join(' - ').trim() || 'Lançamento OFX'

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

    const warnings = [...ignoredReasons.entries()].map(
      ([reason, count]) => `${count} lançamento(s) OFX foram ignorados por parecerem ${reason}.`
    )

    return { items, warnings }
  }
}
