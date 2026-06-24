export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { groqTranscriptionService } from '@/lib/ai/GroqTranscriptionService'
import { groqVisionService } from '@/lib/ai/GroqVisionService'
import { extractTextFromPdf, PDF_EXTRACT_MAX_PAGES } from '@/lib/whatsapp/PdfExtractorService'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementAudioMessage, checkAndIncrementExportImport } from '@/lib/billing/free-tier'
import {
  findWhatsAppUser,
  logInboundWhatsAppMessage,
  processWhatsAppButtonReply,
  processWhatsAppMessage,
  updateWhatsAppMessageLog,
} from '@/lib/whatsapp/WhatsAppMessageParser'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { flushPostHogLogs, posthogLogs } from '@/lib/posthog-logs'
import { getWhatsAppMessages } from '@/lib/whatsapp/messages'

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
  image?: { id?: string; mime_type?: string; caption?: string }
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string }
  button?: { payload?: string; text?: string }
  interactive?: {
    type?: string
    button_reply?: { id?: string; title?: string }
  }
}

const MAX_AUDIO_BYTES = Number(process.env.WHATSAPP_AUDIO_MAX_BYTES ?? 10_000_000)
const MAX_MEDIA_BYTES = 25_000_000

// Strips accents and lowercases so template button replies match regardless of
// locale/casing — WhatsApp sends the button's literal label as typed text when
// a user types it instead of tapping (e.g. "Sí, crear" / "Si, crear").
function normalizeWhatsAppText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

// Button labels from the pt-BR/en/es audio-confirmation WhatsApp templates.
const CONFIRM_PHRASES = new Set(['sim, criar', 'sim criar', 'yes, create', 'yes create', 'si, crear', 'si crear'])
const RETRY_PHRASES = new Set([
  'tentar de novo', 'nao, vou tentar de novo',
  'try again', 'no, try again',
  'intentar otra vez', 'no, intentar otra vez',
])

function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.error('[webhook] WHATSAPP_APP_SECRET not configured - rejecting all requests')
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
      const logPayload = {
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
      }
      if (error) {
        console.error('[webhook] delivery FAILED', JSON.stringify(logPayload))
      } else {
        console.log(`[webhook] delivery status=${status.status} msg=${status.id} to=...${status.recipient_id?.slice(-4)}`)
      }
      await posthogLogs.info('WhatsApp message status webhook received', logPayload)
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

    if (message.type === 'image') {
      await processMediaMessage(from, message, 'image')
      await posthogLogs.info('WhatsApp image message processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (message.type === 'document') {
      await processMediaMessage(from, message, 'document')
      await posthogLogs.info('WhatsApp document message processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (message?.type !== 'text') {
      const userRow = await findWhatsAppUser(from)
      await whatsAppService.sendTextMessage(from, getWhatsAppMessages(userRow?.locale).unsupportedMessageType)
      await posthogLogs.info('WhatsApp webhook ignored unsupported message type', {
        endpoint: '/api/whatsapp/webhook',
        message_type: message?.type ?? 'unknown',
      })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    const messageId: string = message.id
    const text: string = message.text?.body ?? ''
    const normalizedText = normalizeWhatsAppText(text)

    if (CONFIRM_PHRASES.has(normalizedText)) {
      await processWhatsAppButtonReply(from, 'audio_confirm_yes', message.id)
      await posthogLogs.info('WhatsApp typed confirmation processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (RETRY_PHRASES.has(normalizedText)) {
      await processWhatsAppButtonReply(from, 'audio_confirm_no', message.id)
      await posthogLogs.info('WhatsApp typed rejection processed', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Handle opt-out requests (Meta WhatsApp Business policy requirement).
    // Meta's platform also honors opt-outs at the account level, but we acknowledge
    // them here explicitly. A future migration should store whatsapp_opted_out=true
    // in the users table and check it before sending outbound messages.
    const OPT_OUT_KEYWORDS = new Set([
      // pt-BR
      'parar', 'cancelar', 'descadastrar', 'sair', 'sair da lista',
      // en
      'stop', 'unsubscribe', 'cancel',
      // es
      'darse de baja', 'salir', 'baja',
    ])
    if (OPT_OUT_KEYWORDS.has(normalizedText)) {
      const userRow = await findWhatsAppUser(from)
      await whatsAppService.sendTextMessage(from, getWhatsAppMessages(userRow?.locale).optOutConfirmation)
      await posthogLogs.info('WhatsApp opt-out received', { endpoint: '/api/whatsapp/webhook' })
      await flushPostHogLogs()
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Cap text length to limit prompt-injection surface area
    const cappedText = text.length > 500 ? text.slice(0, 500) : text

    await processWhatsAppMessage(from, cappedText, messageId)
    await posthogLogs.info('WhatsApp text message processed', { endpoint: '/api/whatsapp/webhook' })
  } catch (error) {
    await posthogLogs.error('WhatsApp webhook processing failed', { endpoint: '/api/whatsapp/webhook' }, error)
    // Always return 200 to prevent Meta from retrying
  }

  await flushPostHogLogs()
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

async function processMediaMessage(
  from: string,
  message: WhatsAppMessage,
  mediaType: 'image' | 'document'
): Promise<void> {
  const mediaInfo = mediaType === 'image' ? message.image : message.document
  const mediaId = mediaInfo?.id
  if (!mediaId) {
    const lookupForMissingMedia = await findWhatsAppUser(from)
    await whatsAppService.sendTextMessage(from, getWhatsAppMessages(lookupForMissingMedia?.locale).errors.mediaFetchError)
    return
  }

  const declaredMime = mediaInfo?.mime_type ?? ''
  if (mediaType === 'document' && declaredMime && !declaredMime.includes('pdf')) {
    const lookupForUnsupportedFormat = await findWhatsAppUser(from)
    await whatsAppService.sendTextMessage(
      from,
      getWhatsAppMessages(lookupForUnsupportedFormat?.locale).errors.unsupportedDocumentFormat
    )
    return
  }

  const inserted = await logInboundWhatsAppMessage(message.id, mediaType, mediaId)
  if (!inserted) return

  const userRow = await findWhatsAppUser(from)
  if (!userRow) {
    await whatsAppService.sendTextMessage(from, getWhatsAppMessages(null).notRegistered)
    return
  }
  const mediaMessages = getWhatsAppMessages(userRow.locale)

  await updateWhatsAppMessageLog(message.id, {
    family_id: userRow.family_id,
    user_id: userRow.id,
    transcription_status: 'pending',
  })

  if (mediaType === 'document') {
    const access = await hasBillingAccess({ familyId: userRow.family_id })
    if (access.isFreeTier) {
      const usage = await checkAndIncrementExportImport(userRow.family_id)
      if (!usage.allowed) {
        await updateWhatsAppMessageLog(message.id, { transcription_status: 'skipped', transcription_error: 'import_limit_reached' })
        await whatsAppService.sendTextMessage(from, mediaMessages.errors.importLimitReached)
        return
      }
    }
  }

  try {
    const media = await whatsAppService.getMediaUrl(mediaId)
    const downloaded = await whatsAppService.downloadMedia(media.url)
    if (downloaded.buffer.byteLength > MAX_MEDIA_BYTES) {
      throw new Error(`File too large: ${downloaded.buffer.byteLength} bytes`)
    }

    const detectedMime = media.mimeType ?? downloaded.mimeType

    let extractedText: string
    let extractionModel: string

    if (mediaType === 'document' && detectedMime.includes('pdf')) {
      const pdf = await extractTextFromPdf(downloaded.buffer)
      extractedText = pdf.text
      extractionModel = 'pdf-parse'
      if (!extractedText) {
        await updateWhatsAppMessageLog(message.id, {
          transcription_status: 'failed',
          transcription_error: 'pdf_no_text',
        })
        await whatsAppService.sendTextMessage(from, mediaMessages.errors.pdfNoTextDetected)
        return
      }
      if (pdf.totalPages > PDF_EXTRACT_MAX_PAGES) {
        await whatsAppService.sendTextMessage(from, mediaMessages.errors.pdfMultiPageWarning(PDF_EXTRACT_MAX_PAGES))
      }
    } else {
      extractedText = await groqVisionService.extractTextFromImage(downloaded.buffer, detectedMime)
      extractionModel = 'llama-4-scout-vision'
    }

    await updateWhatsAppMessageLog(message.id, {
      transcript: extractedText,
      transcription_model: extractionModel,
      transcription_status: 'completed',
      transcription_error: null,
    })

    await processWhatsAppMessage(from, extractedText, message.id, {
      skipMessageLog: true,
      messageType: mediaType,
      sourceMessageId: message.id,
      requireConfirmation: true,
      transcript: extractedText,
    })
  } catch (error) {
    console.error(`[webhook] ${mediaType} processing failed`, error)
    await updateWhatsAppMessageLog(message.id, {
      transcription_status: 'failed',
      transcription_error: error instanceof Error ? error.message : 'unknown_error',
    })
    await posthogLogs.error(`WhatsApp ${mediaType} processing failed`, {
      endpoint: '/api/whatsapp/webhook',
      family_id: userRow.family_id,
      user_id: userRow.id,
    }, error)
    await whatsAppService.sendTextMessage(
      from,
      mediaType === 'image' ? mediaMessages.errors.imageReadError : mediaMessages.errors.pdfReadError
    )
  }
}

async function processAudioMessage(from: string, message: WhatsAppMessage): Promise<void> {
  const mediaId = message.audio?.id
  if (!mediaId) {
    const lookupForMissingMedia = await findWhatsAppUser(from)
    await whatsAppService.sendTextMessage(from, getWhatsAppMessages(lookupForMissingMedia?.locale).errors.audioFetchError)
    return
  }

  const inserted = await logInboundWhatsAppMessage(message.id, 'audio', mediaId)
  if (!inserted) return

  const userRow = await findWhatsAppUser(from)
  if (!userRow) {
    await whatsAppService.sendTextMessage(from, getWhatsAppMessages(null).notRegistered)
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
      await whatsAppService.sendTextMessage(from, getWhatsAppMessages(userRow.locale).errors.audioLimitReached)
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
    await whatsAppService.sendTextMessage(from, getWhatsAppMessages(userRow.locale).errors.audioTranscriptionError)
  }
}
