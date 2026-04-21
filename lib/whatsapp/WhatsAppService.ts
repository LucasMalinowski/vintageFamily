export class WhatsAppService {
  private token: string
  private apiUrl: string

  constructor() {
    this.token = process.env.WHATSAPP_API_TOKEN!
    this.apiUrl = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  }

  async sendTextMessage(to: string, text: string): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`WhatsApp API error ${response.status}: ${body}`)
    }
  }

  async sendAuthOtp(to: string, code: string): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: 'florim_otp',
          language: { code: 'pt_BR' },
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
        await this.sendTextMessage(
          to,
          `Seu código de verificação do Florim é: *${code}*\nVálido por 10 minutos. Não compartilhe este código.`
        )
        return
      }
      throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(errorBody)}`)
    }
  }
}

export const whatsAppService = new WhatsAppService()
