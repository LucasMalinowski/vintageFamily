import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CsvStatementParser } from '@/lib/bank-statements/CsvStatementParser'

const nubankFixture = readFileSync(join(process.cwd(), 'tests/fixtures/bank-statements/synthetic-nubank.csv'), 'utf-8')
const interFixture = readFileSync(join(process.cwd(), 'tests/fixtures/bank-statements/synthetic-inter.csv'), 'utf-8')

describe('CsvStatementParser — Nubank format (signed amount, EN decimal, comma delimiter)', () => {
  it('parses all 10 transactions from the fixture', () => {
    const { items, warnings } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items).toHaveLength(10)
    expect(warnings).toEqual([])
  })

  it('correctly parses the first income transaction', () => {
    const { items } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items[0]).toMatchObject({
      date: '2026-03-01',
      description: 'PIX RECEBIDO JOAO SILVA',
      amount: 1250,
      type: 'income',
      bank: 'nubank',
    })
    expect(items[0].confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('correctly parses the first expense transaction', () => {
    const { items } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items[1]).toMatchObject({
      date: '2026-03-02',
      description: 'PIX ENVIADO MERCADO CENTRAL',
      amount: 89.9,
      type: 'expense',
    })
  })

  it('classifies expected income and expense keywords correctly', () => {
    const { items } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items.find((i) => i.description.includes('SALARIO'))?.type).toBe('income')
    expect(items.find((i) => i.description.includes('TARIFA'))?.type).toBe('expense')
    expect(items.find((i) => i.description.includes('ESTORNO'))?.type).toBe('income')
    expect(items.find((i) => i.description.includes('SAQUE'))?.type).toBe('expense')
  })

  it('sets amount to absolute value (never negative)', () => {
    const { items } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items.every((item) => item.amount > 0)).toBe(true)
  })

  it('populates rawLine and rawPayload fields', () => {
    const { items } = new CsvStatementParser('nubank').parse(nubankFixture)
    expect(items[0].rawLine).toBeTruthy()
    expect(items[0].rawPayload).toBeTruthy()
  })
})

describe('CsvStatementParser — Inter format (signed amount, BR decimal, semicolon, two description columns)', () => {
  it('parses all 10 transactions from the Inter fixture', () => {
    const { items, warnings } = new CsvStatementParser('inter').parse(interFixture)
    expect(items).toHaveLength(10)
    expect(warnings).toEqual([])
  })

  it('joins Histórico + Descrição columns into a single description', () => {
    const { items } = new CsvStatementParser('inter').parse(interFixture)
    expect(items[0].description).toBe('PIX RECEBIDO - JOAO SILVA')
  })

  it('correctly parses BR decimal amounts (1250,00)', () => {
    const { items } = new CsvStatementParser('inter').parse(interFixture)
    expect(items[0].amount).toBe(1250)
    expect(items[1].amount).toBe(89.9)
  })

  it('uses TARIFA row description when secondary description is empty', () => {
    const { items } = new CsvStatementParser('inter').parse(interFixture)
    const tarifa = items.find((i) => i.description.includes('TARIFA'))
    expect(tarifa).toBeDefined()
    expect(tarifa?.type).toBe('expense')
  })
})

describe('CsvStatementParser — debit/credit column format', () => {
  // Traditional bank format: separate Crédito (income) and Débito (expense) columns
  // Crédito = money coming INTO your account (income); Débito = money going OUT (expense)
  const debitCreditCsv = `
Data;Histórico;Docto.;Crédito;Débito;Saldo
01/03/2026;PIX RECEBIDO JOAO SILVA;;1.250,00;;5.100,00
02/03/2026;PIX ENVIADO MERCADO CENTRAL;;;89,90;5.010,10
03/03/2026;COMPRA NO DEBITO PADARIA SOL;;;24,50;4.985,60
05/03/2026;TRANSFERENCIA RECEBIDA EMPRESA X;;2.000,00;;6.805,60
06/03/2026;TARIFA MENSAL PACOTE;;;19,90;6.785,70
`.trim()

  it('detects income from the Crédito column', () => {
    const { items } = new CsvStatementParser('itau').parse(debitCreditCsv)
    expect(items[0]).toMatchObject({ type: 'income', amount: 1250, date: '2026-03-01' })
  })

  it('detects expense from the Débito column', () => {
    const { items } = new CsvStatementParser('itau').parse(debitCreditCsv)
    expect(items[1]).toMatchObject({ type: 'expense', amount: 89.9, date: '2026-03-02' })
  })

  it('parses Brazilian thousand-separator amounts (1.250,00)', () => {
    const { items } = new CsvStatementParser('itau').parse(debitCreditCsv)
    expect(items[0].amount).toBe(1250)
    expect(items[3].amount).toBe(2000)
  })

  it('returns 5 items', () => {
    const { items } = new CsvStatementParser('itau').parse(debitCreditCsv)
    expect(items).toHaveLength(5)
  })
})

describe('CsvStatementParser — edge cases and resilience', () => {
  it('strips UTF-8 BOM from the beginning of the file', () => {
    const withBom = '\uFEFFData,Lançamento,Valor\n01/03/2026,PIX RECEBIDO,500.00\n'
    const { items } = new CsvStatementParser('nubank').parse(withBom)
    expect(items).toHaveLength(1)
    expect(items[0].amount).toBe(500)
  })

  it('handles CRLF line endings', () => {
    const crlf = 'Data,Lançamento,Valor\r\n01/03/2026,PIX RECEBIDO,500.00\r\n02/03/2026,SAQUE,-100.00\r\n'
    const { items } = new CsvStatementParser('nubank').parse(crlf)
    expect(items).toHaveLength(2)
  })

  it('skips rows with unparseable date cells (totals, footnotes)', () => {
    const csv = 'Data,Lançamento,Valor\n01/03/2026,PIX RECEBIDO,500.00\nTotal,,500.00\n'
    const { items } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
  })

  it('skips zero-amount rows', () => {
    const csv = 'Data,Lançamento,Valor\n01/03/2026,PIX RECEBIDO,500.00\n02/03/2026,ZERAGEM,0.00\n'
    const { items } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
  })

  it('ignores investment entries and returns a warning', () => {
    const csv = [
      'Data,Lançamento,Valor',
      '01/03/2026,APLICACAO CDB,-1000.00',
      '02/03/2026,PIX RECEBIDO JOAO,500.00',
    ].join('\n')
    const { items, warnings } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
    expect(items[0].description).toContain('PIX RECEBIDO')
    expect(warnings[0]).toContain('movimentação de investimento ou reserva')
  })

  it('ignores internal transfer entries and returns a warning', () => {
    const csv = [
      'Data,Lançamento,Valor',
      '01/03/2026,TRANSFERENCIA INTERNA,-500.00',
      '02/03/2026,PIX RECEBIDO JOAO,500.00',
    ].join('\n')
    const { items, warnings } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
    expect(warnings[0]).toContain('movimentação interna entre contas')
  })

  it('returns empty items and a warning when the file has no recognisable header', () => {
    const csv = 'foo,bar,baz\n1,2,3\n'
    const { items, warnings } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('handles quoted fields with commas inside', () => {
    const csv = 'Data,Lançamento,Valor\n01/03/2026,"PIX RECEBIDO, JOAO SILVA",500.00\n'
    const { items } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
    expect(items[0].description).toBe('PIX RECEBIDO, JOAO SILVA')
  })

  it('finds the header even when there are leading non-data rows', () => {
    const csv = [
      'Banco: Nubank',
      'Período: 01/03/2026 a 31/03/2026',
      'Data,Lançamento,Valor',
      '01/03/2026,PIX RECEBIDO JOAO,500.00',
    ].join('\n')
    const { items } = new CsvStatementParser('nubank').parse(csv)
    expect(items).toHaveLength(1)
  })
})
