export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processWhatsAppMessage } from '@/lib/whatsapp/WhatsAppMessageParser'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'

type WhatsAppStatus = {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
  conversation?: {
    id?: string
    origin?: { type?: string }
  }
  pricing?: {
    billable?: boolean
    category?: string
    pricing_model?: string
  }
  errors?: {
    code?: number
    title?: string
    message?: string
    error_data?: { details?: string }
  }[]
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.error('[webhook] WHATSAPP_APP_SECRET not configured — rejecting all requests')
    return false
  }
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
      posthogLogs.warn('WhatsApp webhook rejected: invalid signature', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = JSON.parse(rawBody)

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const status = value?.statuses?.[0] as WhatsAppStatus | undefined

    if (status) {
      const error = status.errors?.[0]
      await posthogLogs.info('WhatsApp message status webhook received', {
        endpoint: '/api/whatsapp/webhook',
        meta_message_id: status.id ?? 'unknown',
        whatsapp_status: status.status ?? 'unknown',
        recipient_last4: status.recipient_id?.replace(/\D/g, '').slice(-4) ?? 'unknown',
        conversation_origin: status.conversation?.origin?.type ?? 'unknown',
        pricing_category: status.pricing?.category ?? 'unknown',
        pricing_billable: status.pricing?.billable ?? false,
        pricing_model: status.pricing?.pricing_model ?? 'unknown',
        error_code: error?.code ?? 0,
        error_title: error?.title ?? 'none',
        error_message: error?.message ?? error?.error_data?.details ?? 'none',
      })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (!value?.messages) {
      await posthogLogs.info('WhatsApp webhook received non-message payload', {
        endpoint: '/api/whatsapp/webhook',
        field: changes?.field ?? 'unknown',
      })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const message = value.messages[0]
    const from: string = message.from

    if (message?.type !== 'text') {
      await whatsAppService.sendTextMessage(from, 'Só consigo processar mensagens de texto. Descreva sua despesa, receita ou lembrete em texto. 😊')
      await posthogLogs.info('WhatsApp webhook ignored unsupported message type', {
        endpoint: '/api/whatsapp/webhook',
        message_type: message?.type ?? 'unknown',
      })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const messageId: string = message.id
    const text: string = message.text?.body ?? ''

    await processWhatsAppMessage(from, text, messageId)
    await posthogLogs.info('WhatsApp text message processed', { endpoint: '/api/whatsapp/webhook' })
  } catch (error) {
    await posthogLogs.error('WhatsApp webhook processing failed', { endpoint: '/api/whatsapp/webhook' }, error)
    // Always return 200 to prevent Meta from retrying
  }

  await flushPostHogLogs()
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
