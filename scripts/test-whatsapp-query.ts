/**
 * Local test for WhatsApp query flow.
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
  'Quanto eu gastei em comida esse mês?',
  'Qual foi meu maior gasto essa semana?',
  'Me mostra meus sonhos',
  'Quanto recebi esse ano?',
  // 'Gastei 50 no mercado',       // record — should go through existing flow
  // 'oi tudo bem?',               // neither — should show usage hint
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
