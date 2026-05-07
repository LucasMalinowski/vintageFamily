export class WhatsAppService {
  private token: string
  private apiUrl: string

  constructor() {
    this.token = process.env.WHATSAPP_API_TOKEN!
    this.apiUrl = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
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

  async sendPrivacyNotice(to: string): Promise<void> {
    const appUrl = 'https://florim.app'
    await this.sendTextMessage(
      to,
      `> 🔒 Em conformidade com a *LGPD*, seus dados são tratados com total segurança pelo *Florim*. Nenhuma informação é compartilhada com terceiros.\n` +
      `> 📄 Termos e Política de Privacidade: ${appUrl}/termos-e-servicos`
    )
  }

  async sendWelcomeTips(to: string): Promise<void> {
    await this.sendTextMessage(
      to,
      `✅ *Número verificado! Bem-vindo ao Florim.*\n\n` +
      `Aqui vão algumas dicas rápidas:\n\n` +
      `📌 *Fixe esta conversa* — Toque e segure este chat e selecione "Fixar" para ter acesso fácil sempre que precisar registrar algo.\n\n` +
      `💬 *O que você pode fazer:*\n` +
      `• "Gastei 50 no mercado" → registra despesa\n` +
      `• "Recebi 3000 de salário" → registra receita\n` +
      `• "Quanto gastei esse mês?" → consulta de gastos\n` +
      `• "Mostre despesas de alimentação" → filtra por categoria\n\n` +
      `É só mandar uma mensagem como se fosse falar com um amigo! 😊\n\n` +
      `_Este serviço utiliza inteligência artificial. Sempre que possível, confira os registros no app e, se algo não estiver certo, nos conte — sua família merece precisão._`
    )
  }

  async sendAuthOtp(to: string, code: string): Promise<{ messageId: string | null }> {
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
        return this.sendTextMessage(
          to,
          `Seu código de verificação do Florim é: *${code}*\nVálido por 10 minutos. Não compartilhe este código.`
        )
      }
      throw new Error(`WhatsApp API error ${response.status}: ${JSON.stringify(errorBody)}`)
    }

    const body = await response.json().catch(() => null) as { messages?: { id?: string }[] } | null
    return { messageId: body?.messages?.[0]?.id ?? null }
  }
}

export const whatsAppService = new WhatsAppService()
