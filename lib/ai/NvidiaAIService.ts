export interface AIExtractedRecord {
  type: 'expense' | 'income' | 'dream_contribution' | 'reminder'
  description: string
  amount_cents: number
  date: string
  category_name: string | null
  payment_method: 'PIX' | 'Credito' | 'Debito' | null
  status?: 'paid' | 'open'
  installments?: number
  dream_name?: string
}

export interface IntentClassification {
  type: 'query' | 'record'
  data_needed: Array<'expenses' | 'incomes' | 'dreams' | 'reminders'>
  time_range: 'current_month' | 'last_month' | 'current_year' | 'last_7_days' | 'next_7_days' | 'all'
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
  selected: number[]
  focus_label: string | null
  context_selected?: number[]   // related but secondary items
  context_label?: string | null // e.g. "transporte em geral"
}

const DEFAULT_INTENT: IntentClassification = { type: 'record', data_needed: [], time_range: 'current_month', focus: null }

const ROUTER_SYSTEM_PROMPT = (todayISO: string) => `Você é um classificador de intenção para um app financeiro. Responda APENAS com JSON válido, sem texto adicional.
Hoje é ${getDayOfWeekPT(todayISO)}, ${todayISO}.

Formato obrigatório:
{"type":"record","data_needed":[],"time_range":"current_month","focus":null}

Campos:
- type: "record" se registrando/criando algo. "query" se consultando dados existentes.
- data_needed: vazio para "record". Para "query": ["expenses"], ["incomes"], ["dreams"], ["reminders"]
- time_range: "current_month" (padrão), "last_month", "current_year", "last_7_days", "next_7_days", "all"
  Use "next_7_days" para lembretes futuros ("essa semana", "próximos dias")
- focus: palavra-chave de filtro ou null

Exemplos:
"Quanto gastei em comida esse mês?" → {"type":"query","data_needed":["expenses"],"time_range":"current_month","focus":"comida"}
"Qual meu maior gasto essa semana?" → {"type":"query","data_needed":["expenses"],"time_range":"last_7_days","focus":null}
"Quanto recebi esse ano?" → {"type":"query","data_needed":["incomes"],"time_range":"current_year","focus":null}
"Me mostra meus sonhos" → {"type":"query","data_needed":["dreams"],"time_range":"all","focus":null}
"Quais meus lembretes essa semana?" → {"type":"query","data_needed":["reminders"],"time_range":"next_7_days","focus":null}
"Gastei 50 no mercado" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"Comprei um tênis de 150 em 3x" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"Me lembre de comprar ovo" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"Não esquecer de pagar o boleto" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}
"oi tudo bem?" → {"type":"record","data_needed":[],"time_range":"current_month","focus":null}`

const buildClassifierPrompt = (focus: string | null) => `Você é um classificador de consultas financeiras. Responda APENAS com JSON válido, sem texto adicional.

Dado uma pergunta, um filtro explícito (se houver) e uma lista de itens financeiros, retorne:
{"query_type":"sum","selected":[0,1],"focus_label":"comida","context_selected":[],"context_label":null}

query_type:
- "sum": total gasto/recebido ("quanto gastei em X", "total de X")
- "max": maior gasto/receita ("maior gasto", "mais caro")
- "list": listar itens ("me mostra", "quais foram")
- "count": contar ocorrências ("quantas vezes", "quantos")

${focus ? `Filtro explícito desta consulta: "${focus}"
Inclua em selected APENAS itens cuja description ou category está diretamente relacionada a "${focus}".
Se nenhum item corresponde a "${focus}", retorne selected:[].
NÃO inclua itens de outras categorias mesmo que pareçam relacionados.` : `Sem filtro — inclua todos os itens em selected para "max"; para "sum"/"list"/"count" inclua todos relevantes.`}

Regra crítica: na dúvida, prefira selected:[] a incluir itens incorretos.

focus_label: nome curto que descreve os itens que foram SELECIONADOS. Derive da category dos itens encontrados, não da pergunta. Pode ser diferente do filtro.
context_selected: itens secundários relacionados. Use [] por padrão.
context_label: null por padrão.

Exemplos (ilustrativos — o foco_label deve refletir o que foi encontrado, não um template fixo):

Filtro "comida", itens: [{idx:0,description:"Mercado",category:"Alimentação"},{idx:1,description:"Farmácia",category:"Saúde / Farmácia"}]
→ {"query_type":"sum","selected":[0],"focus_label":"alimentação","context_selected":[],"context_label":null}

Filtro "comida", itens: [{idx:0,description:"Farmácia",category:"Saúde"},{idx:1,description:"Gasolina",category:"Combustível"}]
→ {"query_type":"sum","selected":[],"focus_label":null,"context_selected":[],"context_label":null}

Filtro "carro", itens com manutenção e combustível: selected = itens de manutenção, focus_label = categoria real desses itens, context_selected = itens de combustível
Filtro "carro", apenas combustível disponível: selected = itens de combustível, focus_label = categoria real, context_selected = []

Sem filtro, query_type "max": selected = todos os itens, focus_label = null`

function getDayOfWeekPT(isoDate: string): string {
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
  const [y, m, d] = isoDate.split('-').map(Number)
  return days[new Date(y, m - 1, d).getDay()]
}

function addDaysToISO(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nextWeekdayISO(isoDate: string, targetDay: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const current = date.getDay()
  const diff = ((targetDay - current + 7) % 7) || 7
  return addDaysToISO(isoDate, diff)
}

const SYSTEM_PROMPT = (categoriesText: string, todayISO: string) => {
  const dayOfWeek = getDayOfWeekPT(todayISO)
  const nextMonday = addDaysToISO(todayISO, ((1 - new Date(...(todayISO.split('-').map(Number) as [number, number, number])).getDay() + 7) % 7) || 7)
  const nextFriday = nextWeekdayISO(todayISO, 5)
  const in7days = addDaysToISO(todayISO, 7)

  return `Você é um assistente financeiro. Extraia registros de mensagens em português.

Hoje é ${dayOfWeek}, ${todayISO}.
Próxima segunda-feira: ${nextMonday}. Próxima sexta-feira: ${nextFriday}. Daqui a 7 dias: ${in7days}.

Categorias disponíveis (use o nome EXATO):
${categoriesText}

Regras gerais:
- Responda APENAS com JSON: {"records": [...]}
- Para mensagens sem conteúdo financeiro ou lembrete, responda: {"records": []}
- date: YYYY-MM-DD. Use hoje se não mencionado. Para datas futuras ("semana que vem", "na sexta", "amanhã"), calcule a partir de hoje.
- category_name: use a subcategoria mais específica disponível (ex: prefira "Transporte / Combustível" a "Transporte" para gasolina)

Tipos de registro:

"expense" — gastos, compras, pagamentos ("gastei", "paguei", "comprei"):
  - amount_cents: valor em centavos (R$10,50 → 1050)
  - payment_method: "PIX" | "Credito" | "Debito" | null. Use "Credito" para parcelado.
  - status: "paid" (padrão — já pagou/comprou) | "open" (ainda precisa pagar: "tenho que pagar", "vou pagar")
  - installments: número de parcelas. Padrão 1. "2x"→2, "3x"→3.
    IMPORTANTE: amount_cents é o valor TOTAL (ex: R$150 em 3x → amount_cents:15000, installments:3)

"income" — recebimentos ("recebi", "entrou", "salário"):
  - amount_cents, payment_method: null

"dream_contribution" — poupança para objetivo ("guardei para", "pousei para"):
  - dream_name: nome do sonho mencionado
  - amount_cents

"reminder" — lembretes e tarefas ("me lembra de", "não esquecer de", "lembrete para", "preciso lembrar de"):
  - description: título do lembrete
  - date: data do lembrete (calcule datas futuras como "na sexta", "semana que vem")
  - amount_cents: 0, category_name: null, payment_method: null

Exemplos:
"gastei 50 reais no mercado no pix"
→ {"records":[{"type":"expense","description":"Mercado","amount_cents":5000,"date":"${todayISO}","category_name":"Mercado","payment_method":"PIX","status":"paid","installments":1}]}

"comprei um tênis de 150 em 3x"
→ {"records":[{"type":"expense","description":"Tênis","amount_cents":15000,"date":"${todayISO}","category_name":"Roupas e Calçados","payment_method":"Credito","status":"paid","installments":3}]}

"gastei 55 de gasolina"
→ {"records":[{"type":"expense","description":"Gasolina","amount_cents":5500,"date":"${todayISO}","category_name":"Transporte / Combustível","payment_method":null,"status":"paid","installments":1}]}

"tenho que pagar o aluguel 800 reais semana que vem"
→ {"records":[{"type":"expense","description":"Aluguel","amount_cents":80000,"date":"${nextMonday}","category_name":"Moradia","payment_method":null,"status":"open","installments":1}]}

"recebi 1500 de salário"
→ {"records":[{"type":"income","description":"Salário","amount_cents":150000,"date":"${todayISO}","category_name":"Renda Familiar","payment_method":null}]}

"guardei 200 para a viagem e gastei 30 no almoço"
→ {"records":[{"type":"dream_contribution","description":"Poupança viagem","amount_cents":20000,"date":"${todayISO}","category_name":null,"payment_method":null,"dream_name":"viagem"},{"type":"expense","description":"Almoço","amount_cents":3000,"date":"${todayISO}","category_name":"Alimentação","payment_method":null,"status":"paid","installments":1}]}

"me lembre de comprar ovo"
→ {"records":[{"type":"reminder","description":"Comprar ovo","amount_cents":0,"date":"${todayISO}","category_name":null,"payment_method":null}]}

"me lembra de pagar o IPVA na sexta"
→ {"records":[{"type":"reminder","description":"Pagar IPVA","amount_cents":0,"date":"${nextFriday}","category_name":null,"payment_method":null}]}

"oi tudo bem?"
→ {"records":[]}
`
}

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
    items: ClassifyItem[],
    focus?: string | null
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
            { role: 'system', content: buildClassifierPrompt(focus ?? null) },
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
