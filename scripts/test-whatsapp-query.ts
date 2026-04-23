/**
 * Local test for WhatsApp message flow (records + queries).
 * Patches sendTextMessage to log instead of hitting the Meta API.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/test-whatsapp-query.ts
 *
 * Change PHONE and MESSAGES below to match your setup.
 */

import { whatsAppService } from '../lib/whatsapp/WhatsAppService'

// ── config ──────────────────────────────────────────────────────────────────
const PHONE = '5545991297862' // your phone number as stored in DB (digits only)

const MESSAGES = [
  // ── queries ──
  'Quanto eu gastei em comida esse mês?',
  'Qual foi meu maior gasto essa semana?',
  'Me mostra meus sonhos',
  'Quanto recebi esse ano?',
  'Quais os lembretes que tenho essa semana?',
  'Quanto gastei com meu carro esse mês?', // should show context (combustível)
  'O que eu tenho pendente pra pagar?',

  // ── record inserts ──
  // 'Gastei 30 na farmácia e 55 de gasolina',          // 2 expenses, status=paid; gasolina → Combustível
  // 'Tenho que pagar o aluguel 800 reais semana que vem', // status=open, date=next week
  // 'Comprei um calçado de 150 em 2x',                 // 2 installments, credit
  // 'Recebi 3000 de salário',                          // income
  // 'Guardei 500 para a viagem',                       // dream contribution
  // 'Me lembre de comprar ovo',                        // reminder insert (today)
  // 'Me lembra de pagar o IPVA na sexta',              // reminder insert (Friday)

  // ── edge cases ──
  // 'oi tudo bem?',                                    // should show USAGE_HINT
]
// ────────────────────────────────────────────────────────────────────────────

whatsAppService.sendTextMessage = async (to: string, text: string) => {
  console.log(`\n📲 Reply to ${to}:\n${'─'.repeat(50)}\n${text}\n${'─'.repeat(50)}`)
}

async function main() {
  const { processWhatsAppMessage } = await import('../lib/whatsapp/WhatsAppMessageParser')

  for (const msg of MESSAGES) {
    console.log(`\n💬 Message: "${msg}"`)
    await processWhatsAppMessage(PHONE, msg)
  }
}

main().catch(console.error)
