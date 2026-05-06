import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatBRL } from '@/lib/money'

type CategoryTotal = {
  category_name: string
  total_cents: number
  count: number
}

type SpendingData = {
  currentMonth: CategoryTotal[]
  previousMonth: CategoryTotal[]
  currentPeriodLabel: string
  previousPeriodLabel: string
  currentTotal: number
  previousTotal: number
}

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function monthLabel(yyyyMM: string): string {
  const [, m] = yyyyMM.split('-').map(Number)
  return MONTH_NAMES_PT[m - 1] ?? yyyyMM
}

async function fetchSpendingData(familyId: string): Promise<SpendingData> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const prevDate = new Date(currentYear, currentMonth - 2, 1)
  const prevYear = prevDate.getFullYear()
  const prevMonth = prevDate.getMonth() + 1

  const fmt = (y: number, m: number) =>
    `${y}-${String(m).padStart(2, '0')}`
  const firstOfMonth = (y: number, m: number) => `${fmt(y, m)}-01`
  const lastOfMonth = (y: number, m: number) => {
    const last = new Date(y, m, 0).getDate()
    return `${fmt(y, m)}-${String(last).padStart(2, '0')}`
  }

  const [curResult, prevResult] = await Promise.all([
    supabaseAdmin
      .from('expenses')
      .select('category_name, amount_cents')
      .eq('family_id', familyId)
      .neq('status', 'pending_confirmation')
      .gte('date', firstOfMonth(currentYear, currentMonth))
      .lte('date', lastOfMonth(currentYear, currentMonth)),
    supabaseAdmin
      .from('expenses')
      .select('category_name, amount_cents')
      .eq('family_id', familyId)
      .neq('status', 'pending_confirmation')
      .gte('date', firstOfMonth(prevYear, prevMonth))
      .lte('date', lastOfMonth(prevYear, prevMonth)),
  ])

  const aggregate = (rows: { category_name: string; amount_cents: number }[]): CategoryTotal[] => {
    const map = new Map<string, { total: number; count: number }>()
    for (const row of rows) {
      const name = row.category_name || 'Outros'
      const prev = map.get(name) ?? { total: 0, count: 0 }
      map.set(name, { total: prev.total + row.amount_cents, count: prev.count + 1 })
    }
    return Array.from(map.entries())
      .map(([category_name, { total, count }]) => ({ category_name, total_cents: total, count }))
      .sort((a, b) => b.total_cents - a.total_cents)
  }

  const currentData = aggregate((curResult.data ?? []) as { category_name: string; amount_cents: number }[])
  const previousData = aggregate((prevResult.data ?? []) as { category_name: string; amount_cents: number }[])

  return {
    currentMonth: currentData,
    previousMonth: previousData,
    currentPeriodLabel: monthLabel(fmt(currentYear, currentMonth)),
    previousPeriodLabel: monthLabel(fmt(prevYear, prevMonth)),
    currentTotal: currentData.reduce((s, r) => s + r.total_cents, 0),
    previousTotal: previousData.reduce((s, r) => s + r.total_cents, 0),
  }
}

function buildInsightPrompt(data: SpendingData, question?: string): string {
  const top5Current = data.currentMonth.slice(0, 5)
  const top5Previous = data.previousMonth.slice(0, 5)

  const currentLines = top5Current
    .map((c, i) => {
      const prev = data.previousMonth.find(p => p.category_name === c.category_name)
      const delta = prev ? ((c.total_cents - prev.total_cents) / prev.total_cents) * 100 : null
      const deltaStr = delta !== null ? ` (${delta > 0 ? '+' : ''}${Math.round(delta)}% vs ${data.previousPeriodLabel})` : ' (sem comparativo)'
      return `${i + 1}. ${c.category_name}: ${formatBRL(c.total_cents)}${deltaStr} — ${c.count} lançamentos`
    })
    .join('\n')

  const previousLines = top5Previous
    .map((c, i) => `${i + 1}. ${c.category_name}: ${formatBRL(c.total_cents)}`)
    .join('\n')

  const totalDelta = data.previousTotal > 0
    ? ` (${data.currentTotal > data.previousTotal ? '+' : ''}${Math.round(((data.currentTotal - data.previousTotal) / data.previousTotal) * 100)}% vs mês anterior)`
    : ''

  const base = `Dados financeiros da família:

Mês atual (${data.currentPeriodLabel}) — Total: ${formatBRL(data.currentTotal)}${totalDelta}
${currentLines}

Mês anterior (${data.previousPeriodLabel}) — Total: ${formatBRL(data.previousTotal)}
${previousLines}`

  if (question) {
    return `${base}

Pergunta do usuário: ${question}

Responda em português, de forma direta e específica, citando valores reais dos dados acima. Máximo 3 parágrafos curtos.`
  }

  return `${base}

Gere exatamente 2 insights financeiros em português para essa família. Regras:
- Cada insight deve ter no máximo 2 frases
- Cite valores reais (ex: R$ 820,00, 30%, 4 lançamentos)
- Seja específico — nunca genérico como "você gastou muito"
- Foque em variações, tendências, ou situações que merecem atenção
- Se os dados são positivos, também diga (ex: você gastou 15% menos em X)
- Formato: retorne um JSON array com 2 strings: ["insight 1", "insight 2"]`
}

export async function generateProactiveInsights(familyId: string): Promise<string[]> {
  const data = await fetchSpendingData(familyId)

  if (data.currentMonth.length === 0) return []

  const prompt = buildInsightPrompt(data)
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let response: Response
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Você é um consultor financeiro pessoal que gera insights específicos e úteis baseados em dados reais. Nunca seja genérico.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 512,
      }),
    })
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return []

  try {
    const json = await response.json()
    const content: string = json.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\[[\s\S]*\]/)
    if (!match) return [content.trim()].filter(Boolean)
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

export async function generateOnDemandInsight(familyId: string, question: string): Promise<string> {
  const data = await fetchSpendingData(familyId)
  const prompt = buildInsightPrompt(data, question)
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return 'Serviço de IA indisponível no momento.'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  let response: Response
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Você é um consultor financeiro pessoal que responde perguntas com base em dados reais. Seja direto, específico e cite valores.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 512,
      }),
    })
  } catch {
    return 'Não consegui gerar o insight no momento. Tente novamente em instantes.'
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return 'Não consegui gerar o insight no momento.'

  const json = await response.json()
  return (json.choices?.[0]?.message?.content ?? '').trim() || 'Sem dados suficientes para gerar um insight.'
}
