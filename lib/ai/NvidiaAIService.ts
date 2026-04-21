export interface AIExtractedRecord {
  type: 'expense' | 'income' | 'dream_contribution'
  description: string
  amount_cents: number
  date: string
  category_name: string | null
  payment_method: 'PIX' | 'Credito' | 'Debito' | null
  dream_name?: string
}

const SYSTEM_PROMPT = (categoriesText: string, todayISO: string) => `
Você é um assistente financeiro. Extraia registros financeiros de mensagens em português.

Hoje é ${todayISO}.

Categorias disponíveis (use o nome EXATO):
${categoriesText}

Regras:
- Responda APENAS com JSON: {"records": [...]}
- Para mensagens sem conteúdo financeiro, responda: {"records": []}
- Tipo "expense": gastos, compras, pagamentos (ex: "gastei", "paguei", "comprei")
- Tipo "income": recebimentos (ex: "recebi", "entrou", "salário")
- Tipo "dream_contribution": poupança para objetivo (ex: "guardei para", "pousei para")
- amount_cents: valor em centavos (ex: R$10,50 → 1050)
- payment_method: "PIX", "Credito", "Debito" ou null se não mencionado
- category_name: escolha a categoria mais próxima da lista; use null se nenhuma se encaixa
- dream_name: apenas para dream_contribution, nome do sonho/objetivo mencionado
- date: data no formato YYYY-MM-DD; use hoje se não mencionada

Exemplos:
Mensagem: "gastei 50 reais no mercado no pix"
{"records":[{"type":"expense","description":"Mercado","amount_cents":5000,"date":"${todayISO}","category_name":"Alimentação / Supermercado","payment_method":"PIX"}]}

Mensagem: "recebi 1500 de salário"
{"records":[{"type":"income","description":"Salário","amount_cents":150000,"date":"${todayISO}","category_name":"Salário","payment_method":null}]}

Mensagem: "guardei 200 reais para a viagem e gastei 30 no almoço"
{"records":[{"type":"dream_contribution","description":"Poupança viagem","amount_cents":20000,"date":"${todayISO}","category_name":null,"payment_method":null,"dream_name":"viagem"},{"type":"expense","description":"Almoço","amount_cents":3000,"date":"${todayISO}","category_name":"Alimentação / Restaurante","payment_method":null}]}

Mensagem: "oi tudo bem?"
{"records":[]}
`

export class NvidiaAIService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY!
  }

  async extractFinancialRecords(
    message: string,
    categoryLabels: Map<string, string>,
    todayISO: string
  ): Promise<AIExtractedRecord[]> {
    const categoriesText = Array.from(categoryLabels.values())
      .sort()
      .join('\n')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

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
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT(categoriesText, todayISO) },
            { role: 'user', content: message },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response.status === 429) {
      throw new Error('Groq rate limit reached. Try again in a moment.')
    }

    if (!response.ok) {
      throw new Error(`Groq API error ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    try {
      const parsed = JSON.parse(jsonMatch[0])
      return Array.isArray(parsed.records) ? parsed.records : []
    } catch {
      return []
    }
  }
}

export const nvidiaAIService = new NvidiaAIService()
