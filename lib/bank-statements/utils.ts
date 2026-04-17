import type { ParsedTransactionType } from '@/lib/bank-statements/types'
import { LOW_CONFIDENCE_THRESHOLD } from '@/lib/bank-statements/constants'

const ENTRY_KEYWORDS = [
  'pix recebido',
  'pix receb',
  'deposito',
  'depósito',
  'salario',
  'salário',
  'transferencia recebida',
  'transferência recebida',
  'credito',
  'crédito',
  'estorno',
  'cashback',
  'rendimento',
  'recebido',
]

const EXPENSE_KEYWORDS = [
  'pix enviado',
  'pix transf',
  'compra',
  'debito',
  'débito',
  'pagamento',
  'saque',
  'transferencia enviada',
  'transferência enviada',
  'tarifa',
  'boleto pago',
  'ted enviada',
  'doc enviada',
]

const IGNORE_PATTERNS = [
  'saldo anterior',
  'saldo do dia',
  'saldo final',
  'saldo em conta',
  'saldo bloqueado',
  'saldo disponivel',
  'saldo disponível',
  'resumo',
  'lancamentos futuros',
  'lançamentos futuros',
  'data historico documento valor saldo',
  'data histórico documento valor saldo',
  'conta corrente',
  'agencia',
  'agência',
  'pagina',
  'página',
  'extrato',
]

export { LOW_CONFIDENCE_THRESHOLD }

export const normalizeFreeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const normalizeDescriptionForHash = (value: string) =>
  normalizeFreeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const isIgnorableStatementLine = (value: string) => {
  const normalized = normalizeFreeText(value)
  if (!normalized) return true
  return IGNORE_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export const parseBrazilianAmountToNumber = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export const clampConfidence = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(2))))

export const detectTransactionType = (description: string, rawLine: string): {
  type: ParsedTransactionType
  confidence: number
} => {
  const haystack = normalizeFreeText(`${description} ${rawLine}`)

  if (haystack.includes('estorno')) {
    return { type: 'income', confidence: 0.88 }
  }

  if (/\b(?:debito|débito| db )\b/.test(` ${haystack} `)) {
    return { type: 'expense', confidence: 0.94 }
  }

  if (/\b(?:credito|crédito| cr )\b/.test(` ${haystack} `)) {
    return { type: 'income', confidence: 0.94 }
  }

  if (EXPENSE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return { type: 'expense', confidence: 0.84 }
  }

  if (ENTRY_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return { type: 'income', confidence: 0.84 }
  }

  return { type: 'expense', confidence: 0.58 }
}

export const formatStatementDate = (day: number, month: number, fallbackYear: number) =>
  `${fallbackYear.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const detectStatementYear = (text: string) => {
  const matches = text.match(/\b20\d{2}\b/g) || []
  const frequency = new Map<number, number>()

  for (const match of matches) {
    const year = Number(match)
    if (year >= 2000 && year <= 2100) {
      frequency.set(year, (frequency.get(year) || 0) + 1)
    }
  }

  const [mostFrequent] = [...frequency.entries()].sort((a, b) => b[1] - a[1])[0] || []
  return mostFrequent || new Date().getFullYear()
}

export const inferExpensePaymentMethod = (description: string): 'PIX' | 'Debito' => {
  const normalized = normalizeFreeText(description)
  if (normalized.includes('debito') || normalized.includes('débito') || normalized.includes('compra')) {
    return 'Debito'
  }
  return 'PIX'
}
