export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processWhatsAppMessage } from '@/lib/whatsapp/WhatsAppMessageParser'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true // skip verification if secret not set (dev only)
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signatureHeader)
  if (expectedBuf.length !== actualBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, actualBuf)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifyMetaSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = JSON.parse(rawBody)

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const message = value.messages[0]
    const from: string = message.from

    if (message?.type !== 'text') {
      await whatsAppService.sendTextMessage(from, 'Só consigo processar mensagens de texto. Descreva sua despesa, receita ou lembrete em texto. 😊')
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const messageId: string = message.id
    const text: string = message.text?.body ?? ''

    await processWhatsAppMessage(from, text, messageId)
  } catch {
    // Always return 200 to prevent Meta from retrying
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
