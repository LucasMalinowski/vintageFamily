import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { OfxStatementParser } from '@/lib/bank-statements/OfxStatementParser'

const fixture = readFileSync(join(process.cwd(), 'tests/fixtures/bank-statements/synthetic.ofx'), 'utf-8')

describe('OfxStatementParser', () => {
  it('parses OFX transactions with explicit debit and credit types', () => {
    const parsed = new OfxStatementParser('inter').parse(fixture)
    const items = parsed.items

    expect(items).toHaveLength(2)
    expect(parsed.warnings).toEqual([])
    expect(items[0]).toMatchObject({
      date: '2026-03-01',
      description: 'PIX RECEBIDO - JOAO SILVA',
      amount: 1250,
      type: 'income',
      bank: 'inter',
    })
    expect(items[1]).toMatchObject({
      date: '2026-03-02',
      amount: 89.9,
      type: 'expense',
    })
  })

  it('ignores OFX investment and internal transfer entries', () => {
    const fixtureWithInvestment = `
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
            <TRNTYPE>XFER
            <DTPOSTED>20260306000000
            <TRNAMT>-500.00
            <FITID>100
            <NAME>TRANSFERENCIA INTERNA
            <MEMO>ENTRE CONTAS
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
`

    const parsed = new OfxStatementParser('inter').parse(fixtureWithInvestment)

    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      description: 'PIX ENVIADO - PADARIA',
      type: 'expense',
    })
    expect(parsed.warnings).toEqual([
      '1 lançamento(s) OFX foram ignorados por parecerem movimentação de investimento ou reserva.',
      '1 lançamento(s) OFX foram ignorados por parecerem transferência interna.',
    ])
  })
})
