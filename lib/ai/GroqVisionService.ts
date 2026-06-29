export class GroqVisionService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY!
  }

  async extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
    // WhatsApp sometimes delivers webp - Groq vision accepts it natively
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)

    let response: Response
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                {
                  type: 'text',
                  text: 'Analise este comprovante de pagamento (cupom fiscal, NFC-e, recibo ou nota). Extraia em texto simples e conciso:\n1. Nome do estabelecimento — se não estiver claramente visível, infira o TIPO de comércio pelos itens ou contexto (ex: "Supermercado", "Farmácia", "Restaurante", "Posto de Combustível", "Padaria", "Loja de Roupas"). Nunca escreva "não identificado".\n2. Data da compra\n3. VALOR TOTAL PAGO (apenas o total final — não liste itens individuais)\n4. Forma de pagamento\n\nResponda apenas com essas 4 informações.',
                },
              ],
            },
          ],
          temperature: 0,
          max_tokens: 512,
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Groq vision API error ${response.status}: ${body}`)
    }

    const data = await response.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) throw new Error('Groq vision returned empty text')
    return text.trim()
  }
}

export const groqVisionService = new GroqVisionService()
