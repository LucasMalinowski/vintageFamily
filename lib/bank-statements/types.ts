import type { Json } from '@/types/database'

export const BANK_IDS = [
  'nubank',
  'itau',
  'bradesco',
  'santander',
  'banco_do_brasil',
  'caixa',
  'inter',
  'c6',
] as const

export type BankId = typeof BANK_IDS[number]
export type StatementFileFormat = 'csv' | 'ofx'

export type ParsedTransactionType = 'income' | 'expense'

export interface ParsedStatementTransaction {
  date: string
  description: string
  amount: number
  type: ParsedTransactionType
  balance?: number | null
  confidence: number
  bank: BankId
  rawText: string
  rawDescription: string
  rawLine: string
  rawPayload: Json
}

export interface ImportSummary {
  totalFound: number
  incomesCreated: number
  expensesCreated: number
  duplicatesIgnored: number
  lowConfidenceCount: number
}

export interface ImportPreviewSummary {
  totalFound: number
  incomesDetected: number
  expensesDetected: number
  duplicatesDetected: number
  lowConfidenceCount: number
}

export interface ImportResult {
  batchId: string
  fileHash: string
  bank: BankId
  format: StatementFileFormat
  pageCount: number
  summary: ImportSummary
  warnings: string[]
  items: ParsedStatementTransaction[]
}

export interface ReviewedImportItem {
  previewKey: string
  description: string
  type: ParsedTransactionType
  categoryId: string | null
  ignore: boolean
}

export interface ImportPreviewItem extends ReviewedImportItem {
  date: string
  amount: number
  confidence: number
  lowConfidence: boolean
  isDuplicate: boolean
  duplicateReason: 'file' | 'database' | 'none'
}

export interface ImportPreviewResult {
  bank: BankId
  format: StatementFileFormat
  fileHash: string
  pageCount: number
  summary: ImportPreviewSummary
  warnings: string[]
  items: ImportPreviewItem[]
}

export interface BankTutorialStep {
  title: string
  detail: string
}

export interface BankTutorialLink {
  label: string
  url: string
}

export interface BankTutorialImage {
  alt: string
  url: string
  sourceUrl: string
}

export type OfxAvailability = 'official' | 'secondary' | 'not_confirmed'

export interface BankTutorial {
  id: BankId
  name: string
  shortName: string
  accent: string
  iconUrl: string
  iconSourceUrl: string
  supportedImportFormats: StatementFileFormat[]
  preferredImportFormat: StatementFileFormat
  ofxAvailability: OfxAvailability
  ofxReferenceUrl?: string
  ofxReferenceLabel?: string
  ofxIntro?: string
  ofxSteps?: BankTutorialStep[]
  tutorialTitle: string
  intro: string
  steps: BankTutorialStep[]
  observations: string[]
  referenceLinks: BankTutorialLink[]
  images: BankTutorialImage[]
  lastVerifiedAt: string
  status: 'validated' | 'validation'
}
