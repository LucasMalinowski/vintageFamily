import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {},
}))

import { BankStatementImportService } from '@/lib/bank-statements/BankStatementImportService'

const nubankFixture = readFileSync(join(process.cwd(), 'tests/fixtures/bank-statements/synthetic-nubank.csv'), 'utf-8')
const ofxFixture = readFileSync(join(process.cwd(), 'tests/fixtures/bank-statements/synthetic.ofx'), 'utf-8')

// Helper: minimal fakeDb that handles duplicate-hash checks only (preview tests)
function makePreviewDb() {
  const fakeDb: any = {
    from: vi.fn((table: string) => {
      if (table === 'incomes' || table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  }
  return fakeDb
}

// Helper: full fakeDb for import/commit tests
function makeImportDb(options: { existingIncomeHash?: string } = {}) {
  const insertedIncomes: any[] = []
  const insertedExpenses: any[] = []

  const fakeDb: any = {
    from: vi.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [
                  { id: 'cat-income', kind: 'income', name: 'Importado de extrato' },
                  { id: 'cat-expense', kind: 'expense', name: 'Importado de extrato' },
                ],
                error: null,
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(async () => ({ data: [], error: null })),
          })),
        }
      }

      if (table === 'incomes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: options.existingIncomeHash ? [{ import_hash: options.existingIncomeHash }] : [],
                error: null,
              })),
            })),
          })),
          insert: vi.fn(async (row: any) => {
            insertedIncomes.push(row)
            return { error: null }
          }),
        }
      }

      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
          insert: vi.fn(async (row: any) => {
            insertedExpenses.push(row)
            return { error: null }
          }),
        }
      }

      if (table === 'bank_statement_import_batches') {
        return {
          insert: vi.fn(async () => ({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        }
      }

      throw new Error(`unexpected table: ${table}`)
    }),
    _insertedIncomes: insertedIncomes,
    _insertedExpenses: insertedExpenses,
  }

  return fakeDb
}

describe('BankStatementImportService', () => {
  it('builds a CSV preview with duplicate items pre-marked to ignore', async () => {
    const duplicatedCsv = [
      'Data,Lançamento,Valor',
      '02/12/2025,PIX RECEBIDO JOAO,170.00',
      '02/12/2025,PIX RECEBIDO JOAO,170.00',
    ].join('\n')

    const service = new BankStatementImportService(makePreviewDb())
    const preview = await service.preview({
      bank: 'nubank',
      format: 'csv',
      file: Buffer.from(duplicatedCsv),
      fileName: 'extrato.csv',
      familyId: 'family-1',
      userId: 'user-1',
    })

    expect(preview.summary.totalFound).toBe(2)
    expect(preview.summary.duplicatesDetected).toBe(2)
    expect(preview.items.every((item) => item.ignore)).toBe(true)
  })

  it('imports CSV transactions and sets correct source metadata', async () => {
    const originalRandomUUID = globalThis.crypto.randomUUID
    globalThis.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000'

    const db = makeImportDb()
    const service = new BankStatementImportService(db)
    const result = await service.import({
      bank: 'nubank',
      format: 'csv',
      file: Buffer.from(nubankFixture),
      fileName: 'extrato.csv',
      familyId: 'family-1',
      userId: 'user-1',
    })

    expect(result.summary.totalFound).toBe(10)
    expect(result.format).toBe('csv')
    expect(db._insertedIncomes.every((row: any) => row.source === 'csv_import')).toBe(true)
    expect(db._insertedExpenses.every((row: any) => row.source_type === 'bank_statement_csv')).toBe(true)
    expect(db._insertedExpenses.every((row: any) => row.import_batch_id === '00000000-0000-4000-8000-000000000000')).toBe(true)
    expect(db._insertedIncomes.length + db._insertedExpenses.length).toBeLessThanOrEqual(10)

    globalThis.crypto.randomUUID = originalRandomUUID
  })

  it('commits reviewed items with edited description and category', async () => {
    const singleRowCsv = 'Data,Lançamento,Valor\n02/12/2025,PIX RECEBIDO JOAO,170.00\n'

    const originalRandomUUID = globalThis.crypto.randomUUID
    globalThis.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000010'

    const db = makeImportDb()
    const service = new BankStatementImportService(db)

    // Override category lookup for the review-by-id call to return the custom category
    const originalFrom = db.from.bind(db)
    db.from = vi.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(async (column: string) => {
                if (column === 'id') {
                  return {
                    data: [{ id: 'income-custom', kind: 'income', name: 'Salário' }],
                    error: null,
                  }
                }
                return {
                  data: [
                    { id: 'cat-income', kind: 'income', name: 'Importado de extrato' },
                    { id: 'cat-expense', kind: 'expense', name: 'Importado de extrato' },
                  ],
                  error: null,
                }
              }),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(async () => ({ data: [], error: null })),
          })),
        }
      }
      return originalFrom(table)
    })

    const preview = await service.preview({
      bank: 'nubank',
      format: 'csv',
      file: Buffer.from(singleRowCsv),
      fileName: 'extrato.csv',
      familyId: 'family-1',
      userId: 'user-1',
    })

    await service.commit({
      bank: 'nubank',
      format: 'csv',
      file: Buffer.from(singleRowCsv),
      fileName: 'extrato.csv',
      familyId: 'family-1',
      userId: 'user-1',
      reviewedItems: preview.items.map((item) => ({
        previewKey: item.previewKey,
        description: 'Salário revisado',
        type: 'income',
        categoryId: 'income-custom',
        ignore: false,
      })),
    })

    expect(db._insertedIncomes).toHaveLength(1)
    expect(db._insertedIncomes[0].description).toBe('Salário revisado')
    expect(db._insertedIncomes[0].category_id).toBe('income-custom')
    expect(db._insertedIncomes[0].category_name).toBe('Salário')

    globalThis.crypto.randomUUID = originalRandomUUID
  })

  it('imports OFX with correct source_type metadata', async () => {
    const originalRandomUUID = globalThis.crypto.randomUUID
    globalThis.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000001'

    const db = makeImportDb()
    const service = new BankStatementImportService(db)
    const result = await service.import({
      bank: 'inter',
      format: 'ofx',
      file: Buffer.from(ofxFixture),
      fileName: 'extrato.ofx',
      familyId: 'family-1',
      userId: 'user-1',
    })

    expect(result.format).toBe('ofx')
    expect(db._insertedIncomes.every((row: any) => row.source_type === 'bank_statement_ofx')).toBe(true)
    expect(db._insertedExpenses.every((row: any) => row.source === 'ofx_import')).toBe(true)

    globalThis.crypto.randomUUID = originalRandomUUID
  })

  it('surfaces OFX warnings when investment-like entries are ignored', async () => {
    const service = new BankStatementImportService(makePreviewDb())
    const preview = await service.preview({
      bank: 'inter',
      format: 'ofx',
      file: Buffer.from(`
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>CREDIT
            <DTPOSTED>20260305000000
            <TRNAMT>12500.00
            <FITID>99
            <NAME>APLICACAO RDB
            <MEMO>RESGATE AUTOMATICO
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260307000000
            <TRNAMT>-42.90
            <FITID>101
            <NAME>PIX ENVIADO
            <MEMO>PADARIA
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
      `),
      fileName: 'extrato.ofx',
      familyId: 'family-1',
      userId: 'user-1',
    })

    expect(preview.summary.totalFound).toBe(1)
    expect(preview.warnings).toContain(
      '1 lançamento(s) OFX foram ignorados por parecerem movimentação de investimento ou reserva.'
    )
  })

  it('surfaces CSV warnings when investment-like entries are ignored', async () => {
    const csv = [
      'Data,Lançamento,Valor',
      '01/03/2026,APLICACAO CDB,-2000.00',
      '02/03/2026,PIX RECEBIDO JOAO,500.00',
    ].join('\n')

    const service = new BankStatementImportService(makePreviewDb())
    const preview = await service.preview({
      bank: 'nubank',
      format: 'csv',
      file: Buffer.from(csv),
      fileName: 'extrato.csv',
      familyId: 'family-1',
      userId: 'user-1',
    })

    expect(preview.summary.totalFound).toBe(1)
    expect(preview.warnings.some((w) => w.includes('movimentação de investimento'))).toBe(true)
  })
})
