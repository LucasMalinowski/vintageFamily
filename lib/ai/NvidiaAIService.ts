export interface AIExtractedRecord {
  type: 'expense' | 'income' | 'dream_contribution'
  description: string
  amount_cents: number
  date: string
  category_name: string | null
  payment_method: 'PIX' | 'Credito' | 'Debito' | null
  dream_name?: string
}

export interface IntentClassification {
  type: 'query' | 'record'
  data_needed: Array<'expenses' | 'incomes' | 'dreams' | 'reminders'>
  time_range: 'current_month' | 'last_month' | 'current_year' | 'last_7_days' | 'all'
  focus: string | null
}

// Used to send items to the classifier — no amounts (AI doesn't need them)
export interface ClassifyItem {
  idx: number
  date: string
  description: string
  category: string
}

export interface ClassifyResult {
  query_type: 'sum' | 'max' | 'list' | 'count'
  selected: number[]   // idx values of matching items
  focus_label: string | null
}

const DEFAULT_INTENT: IntentClassification = { type: 'record', data_needed: [], time_range: 'current_month', focus: null }

const ROUTER_SYSTEM_PROMPT = (todayISO: string) => `Você é um classificador de intenção para um app financeiro. Responda APENAS com JSON válido, sem texto adicional.
Hoje é ${todayISO}.

Formato obrigatório:
{"type":"record","data_needed":[],"time_range":"current_month","focus":null}

Campos:
- type: "record" se o usuário está registrando algo agora. "query" se está perguntando sobre dados passados.
- data_needed: array com os dados necessários para responder. Vazio para "record".
  Valores possíveis: "expenses" (gastos), "incomes" (receitas), "dreams" (sonhos/metas), "reminders" (lembretes)
- time_range: "current_month" (padrão), "last_month", "current_year", "last_7_days", "all"
- focus: palavra-chave de filtro ou null

Exemplos:
"Quanto gastei em comida esse mês?" → {"type":"query","data_needed":["expenses"],"time_range":"current_month","focus":"comida"}
"Qual meu maior gasto essa semana?" → {"type":"query","data_needed":["expenses"],"time_range":"last_7_days","focus":null}
"Quanto recebi esse ano?" → {"type":"query","data_needed":["incomes"],"time_range":"current_year","focus":null}
"Me mostra meus sonhos" → {"type":"query","data_needed":["dreams"],"time_range":"all","focus":null}
"Gastei 50 no mercado" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"Recebi 1500 de salário" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"oi tudo bem?" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"bom dia" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}`

const CLASSIFIER_SYSTEM_PROMPT = `Você é um classificador de consultas financeiras. Responda APENAS com JSON válido, sem texto adicional.

Dado uma pergunta e uma lista de itens financeiros, retorne:
{"query_type":"sum","selected":[0,1],"focus_label":"comida"}

query_type:
- "sum": usuário quer total gasto/recebido em algo ("quanto gastei em X", "total de X")
- "max": usuário quer o maior gasto/receita ("maior gasto", "mais caro", "mais gastei")
- "list": usuário quer ver os itens ("me mostra", "quais foram", "lista")
- "count": usuário quer contar ("quantas vezes", "quantos")

selected: array com os valores do campo idx dos itens relevantes para a pergunta.
- Para "sum" com filtro (ex: comida): inclua APENAS itens que semanticamente pertencem ao filtro
- Para "sum" sem filtro: inclua TODOS os itens
- Para "max": inclua TODOS os itens (o sistema determinará o maior)
- Para "list" e "count": inclua os itens relevantes

Mapeamento semântico (use para identificar categorias):
- comida/alimentação: Mercado, Supermercado, Restaurante, Padaria, iFood, Rappi, Delivery, Lanchonete, Almoço, Jantar, Café
- saúde: Farmácia, Hospital, Médico, Dentista, Plano de saúde, Remédio
- transporte: Gasolina, Combustível, Uber, Táxi, Pedágio, Estacionamento, Ônibus, Metrô
- lazer: Cinema, Streaming, Netflix, Spotify, Bar, Viagem, Passeio, Jogo
- casa: Aluguel, Condomínio, Luz, Água, Internet, Conta, Manutenção
- educação: Escola, Faculdade, Curso, Livro, Material escolar

focus_label: palavra que descreve o filtro (ex: "comida", "saúde") ou null se sem filtro específico.

Exemplos:
Pergunta: "Quanto gastei em comida esse mês?"
Itens: [{idx:0,date:"2026-04-21",description:"Mercado",category:"Mercado"},{idx:1,date:"2026-04-21",description:"Farmácia",category:"Saúde"}]
→ {"query_type":"sum","selected":[0],"focus_label":"comida"}

Pergunta: "Qual foi meu maior gasto essa semana?"
Itens: [{idx:0,...},{idx:1,...},{idx:2,...}]
→ {"query_type":"max","selected":[0,1,2],"focus_label":null}`

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

  async classifyIntent(message: string, todayISO: string): Promise<IntentClassification> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)

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
            { role: 'system', content: ROUTER_SYSTEM_PROMPT(todayISO) },
            { role: 'user', content: message },
          ],
          temperature: 0,
          max_tokens: 150,
        }),
      })
    } catch {
      return DEFAULT_INTENT
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) return DEFAULT_INTENT

    try {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return DEFAULT_INTENT
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.type !== 'query' && parsed.type !== 'record') return DEFAULT_INTENT
      return parsed as IntentClassification
    } catch {
      return DEFAULT_INTENT
    }
  }

  async classifyQueryData(
    question: string,
    items: ClassifyItem[]
  ): Promise<ClassifyResult> {
    const fallback: ClassifyResult = {
      query_type: 'list',
      selected: items.map(i => i.idx),
      focus_label: null,
    }

    if (items.length === 0) return fallback

    const itemsText = items
      .map(i => `{idx:${i.idx},date:"${i.date}",description:"${i.description}",category:"${i.category}"}`)
      .join('\n')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

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
            { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
            { role: 'user', content: `Pergunta: ${question}\n\nItens:\n${itemsText}` },
          ],
          temperature: 0,
          max_tokens: 80,
        }),
      })
    } catch {
      return fallback
    } finally {
      clearTimeout(timeout)
    }

    if (response.status === 429) {
      console.warn('[AI] classifyQueryData rate limited — falling back to list-all')
      return fallback
    }

    if (!response.ok) {
      console.error('[AI] classifyQueryData error', response.status)
      return fallback
    }

    try {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return fallback
      const parsed = JSON.parse(jsonMatch[0])
      if (!Array.isArray(parsed.selected)) return fallback
      // Guard: only keep idx values that actually exist in items
      const validIdx = new Set(items.map(i => i.idx))
      parsed.selected = (parsed.selected as number[]).filter(idx => validIdx.has(idx))
      return parsed as ClassifyResult
    } catch {
      return fallback
    }
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
