import { getWhatsAppMessages } from '@/lib/whatsapp/messages'
import { META_TEMPLATE_LANGUAGE } from '@/lib/whatsapp/localeMapping'
import type { AppLocale } from '@/lib/i18n/getLocale'

export class WhatsAppService {
  private token: string
  private apiUrl: string
  private graphBaseUrl = 'https://graph.facebook.com/v25.0'

  constructor() {
    this.token = process.env.WHATSAPP_API_TOKEN!
    this.apiUrl = `${this.graphBaseUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  }

  async sendTextMessage(to: string, text: string): Promise<{ messageId: string | null }> {
    const recipient = to.replace(/\D/g, '')

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp API error ${response.status}: ${body}`)
    }

    const body = await response.json().catch(() => null) as { messages?: { id?: string }[] } | null
    return { messageId: body?.messages?.[0]?.id ?? null }
  }

  private sanitizeTemplateParameter(text: string): string {
    return text.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim()
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    bodyParameters: string[],
    languageCode = 'pt_BR',
    buttons: { index: string; payload: string }[] = [],
    headerImageUrl?: string,
    headerImageId?: string
  ): Promise<{ messageId: string | null }> {
    const recipient = to.replace(/\D/g, '')
    const components: object[] = []

    if (headerImageId || headerImageUrl) {
      // Prefer media_id (uploaded once, cached by Meta) over URL (fetched on every send)
      const imageParam = headerImageId
        ? { type: 'image', image: { id: headerImageId } }
        : { type: 'image', image: { link: headerImageUrl } }
      components.push({ type: 'header', parameters: [imageParam] })
    }

    components.push({
      type: 'body',
      parameters: bodyParameters.map((text) => ({
        type: 'text',
        text: this.sanitizeTemplateParameter(text),
      })),
    })

    components.push(
      ...buttons.map((button) => ({
        type: 'button',
        sub_type: 'quick_reply',
        index: button.index,
        parameters: [{ type: 'payload', payload: button.payload }],
      }))
    )

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp API error ${response.status}: ${body}`)
    }

    const body = await response.json().catch(() => null) as { messages?: { id?: string }[] } | null
    return { messageId: body?.messages?.[0]?.id ?? null }
  }

  async markMessageReadWithTyping(messageId: string): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp read/typing API error ${response.status}: ${body}`)
    }
  }

  async getMediaUrl(mediaId: string): Promise<{ url: string; mimeType: string | null }> {
    const response = await fetch(`${this.graphBaseUrl}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp media metadata API error ${response.status}: ${body}`)
    }

    const body = await response.json() as { url?: string; mime_type?: string }
    if (!body.url) throw new Error('WhatsApp media metadata response missing url')

    return { url: body.url, mimeType: body.mime_type ?? null }
  }

  async downloadMedia(mediaUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp media download API error ${response.status}: ${body}`)
    }

    const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
    const buffer = Buffer.from(await response.arrayBuffer())
    return { buffer, mimeType }
  }

  async sendPrivacyNotice(to: string, locale?: AppLocale | null): Promise<void> {
    const appUrl = 'https://florim.app'
    await this.sendTextMessage(to, getWhatsAppMessages(locale).privacyNotice(appUrl))
  }

  /**
   * Upload an image file to WhatsApp's Media API and return the media_id.
   * Store the returned id in WHATSAPP_INSIGHTS_IMAGE_ID so you only upload once.
   */
  async uploadMedia(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const form = new FormData()
    form.append('messaging_product', 'whatsapp')
    form.append('type', mimeType)
    const ab = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer
    form.append('file', new Blob([ab], { type: mimeType }), 'image.png')

    const res = await fetch(`${this.graphBaseUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`WhatsApp media upload error ${res.status}: ${body}`)
    }
    const data = await res.json() as { id?: string }
    if (!data.id) throw new Error('WhatsApp media upload: no id in response')
    return data.id
  }

  async sendWelcomeTips(to: string, locale?: AppLocale | null): Promise<void> {
    const langCode = META_TEMPLATE_LANGUAGE[locale ?? 'pt-BR'] ?? 'pt_BR'
    await this.sendTemplateMessage(to, 'florim_welcome_tips', [], langCode)
  }

  async sendAuthOtp(to: string, code: string, locale?: AppLocale | null): Promise<{ messageId: string | null }> {
    const recipient = to.replace(/\D/g, '')
    const langCode = META_TEMPLATE_LANGUAGE[locale ?? 'pt-BR'] ?? 'pt_BR'

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: 'florim_otp',
          language: { code: langCode },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: code }],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [{ type: 'text', text: code }],
            },
          ],
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      // Fall back to plain text if template fails (e.g., during dev without approved template)
      if (errorBody?.error?.code === 132001 || errorBody?.error?.code === 132000) {
        return this.sendTextMessage(to, getWhatsAppMessages(locale).otpFallback(code))
      }
      throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(errorBody)}`)
    }

    const body = await response.json().catch(() => null) as { messages?: { id?: string }[] } | null
    return { messageId: body?.messages?.[0]?.id ?? null }
  }
}

export const whatsAppService = new WhatsAppService()
