export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { groqTranscriptionService } from '@/lib/ai/GroqTranscriptionService'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementAudioMessage } from '@/lib/billing/free-tier'
import {
  findWhatsAppUser,
  logInboundWhatsAppMessage,
  processWhatsAppButtonReply,
  processWhatsAppMessage,
  updateWhatsAppMessageLog,
} from '@/lib/whatsapp/WhatsAppMessageParser'
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

type WhatsAppMessage = {
  id: string
  from: string
  type: string
  text?: { body?: string }
  audio?: { id?: string; mime_type?: string }
  button?: { payload?: string; text?: string }
  interactive?: {
    type?: string
    button_reply?: { id?: string; title?: string }
  }
}

const MAX_AUDIO_BYTES = Number(process.env.WHATSAPP_AUDIO_MAX_BYTES ?? 10_000_000)

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

    const message = value.messages[0] as WhatsAppMessage
    const from: string = message.from
    await whatsAppService.markMessageReadWithTyping(message.id).catch((error) => {
      console.warn('[webhook] typing indicator failed', error)
    })

    const buttonPayload = message.button?.payload ?? message.interactive?.button_reply?.id
    if (message.type === 'button' || (message.type === 'interactive' && buttonPayload)) {
      await processWhatsAppButtonReply(from, buttonPayload ?? '', message.id)
      await posthogLogs.info('WhatsApp button reply processed', {
        endpoint: '/api/whatsapp/webhook',
        message_type: message.type,
      })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (message.type === 'audio') {
      await processAudioMessage(from, message)
      await posthogLogs.info('WhatsApp audio message processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

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
    const normalizedText = text.trim().toLowerCase()

    if (normalizedText === 'sim, criar' || normalizedText === 'sim criar') {
      await processWhatsAppButtonReply(from, 'audio_confirm_yes', message.id)
      await posthogLogs.info('WhatsApp typed confirmation processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (normalizedText === 'tentar de novo' || normalizedText === 'não, vou tentar de novo' || normalizedText === 'nao, vou tentar de novo') {
      await processWhatsAppButtonReply(from, 'audio_confirm_no', message.id)
      await posthogLogs.info('WhatsApp typed rejection processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    await processWhatsAppMessage(from, text, messageId)
    await posthogLogs.info('WhatsApp text message processed', { endpoint: '/api/whatsapp/webhook' })
  } catch (error) {
    await posthogLogs.error('WhatsApp webhook processing failed', { endpoint: '/api/whatsapp/webhook' }, error)
    // Always return 200 to prevent Meta from retrying
  }

  await flushPostHogLogs()
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processAudioMessage(from: string, message: WhatsAppMessage): Promise<void> {
  const mediaId = message.audio?.id
  if (!mediaId) {
    await whatsAppService.sendTextMessage(from, 'Não consegui acessar esse áudio. Tente enviar novamente. 🔄')
    return
  }

  const inserted = await logInboundWhatsAppMessage(message.id, 'audio', mediaId)
  if (!inserted) return

  const userRow = await findWhatsAppUser(from)
  if (!userRow) {
    await whatsAppService.sendTextMessage(from, 'Número não cadastrado no Florim. Acesse o app para vincular seu WhatsApp.')
    return
  }

  await updateWhatsAppMessageLog(message.id, {
    family_id: userRow.family_id,
    user_id: userRow.id,
    transcription_status: 'pending',
  })

  const access = await hasBillingAccess({ familyId: userRow.family_id })
  if (access.isFreeTier) {
    const usage = await checkAndIncrementAudioMessage(userRow.family_id)
    if (!usage.allowed) {
      await updateWhatsAppMessageLog(message.id, { transcription_status: 'skipped', transcription_error: 'audio_limit_reached' })
      await whatsAppService.sendTextMessage(
        from,
        'Você usou todos os 10 áudios gratuitos deste mês. 🎯\n\nVocê ainda pode enviar mensagens de texto ou assinar o Florim Pro para usar áudio sem esse limite.'
      )
      return
    }
  }

  try {
    const media = await whatsAppService.getMediaUrl(mediaId)
    const downloaded = await whatsAppService.downloadMedia(media.url)
    if (downloaded.buffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error(`Audio too large: ${downloaded.buffer.byteLength} bytes`)
    }

    const transcription = await groqTranscriptionService.transcribeAudio(
      downloaded.buffer,
      media.mimeType ?? downloaded.mimeType,
      `whatsapp-${message.id}.ogg`
    )

    await updateWhatsAppMessageLog(message.id, {
      transcript: transcription.text,
      transcription_model: transcription.model,
      transcription_status: 'completed',
      transcription_error: null,
    })

    await processWhatsAppMessage(from, transcription.text, message.id, {
      skipMessageLog: true,
      messageType: 'audio',
      sourceMessageId: message.id,
      requireConfirmation: true,
      transcript: transcription.text,
    })
  } catch (error) {
    console.error('[webhook] audio processing failed', error)
    await updateWhatsAppMessageLog(message.id, {
      transcription_status: 'failed',
      transcription_error: error instanceof Error ? error.message : 'unknown_error',
    })
    await posthogLogs.error('WhatsApp audio processing failed', {
      endpoint: '/api/whatsapp/webhook',
      family_id: userRow.family_id,
      user_id: userRow.id,
    }, error)
    await whatsAppService.sendTextMessage(from, 'Não consegui ouvir seu áudio agora. Tente novamente ou envie por texto. 🔄')
  }
}
