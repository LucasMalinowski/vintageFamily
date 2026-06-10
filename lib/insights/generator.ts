import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatBRL } from '@/lib/money'
import { computeNextMonthForecast } from '@/lib/forecast/engine'
import { detectSpendingAnomalies } from '@/lib/forecast/anomaly'
import { generateForecastNarrative } from '@/lib/forecast/narrator'

type CategoryTotal = {
  category_name: string
  total_cents: number
  count: number
  limit_cents?: number | null
}

type SpendingData = {
  currentMonth: CategoryTotal[]
  previousMonth: CategoryTotal[]
  currentPeriodLabel: string
  previousPeriodLabel: string
  currentTotal: number
  previousTotal: number
  currentMonthIncome: number
  previousMonthIncome: number
  dayOfMonth: number
  daysInMonth: number
}

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function monthLabel(yyyyMM: string): string {
  const [, m] = yyyyMM.split('-').map(Number)
  return MONTH_NAMES_PT[m - 1] ?? yyyyMM
}

function nextMonthLabel(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return MONTH_NAMES_PT[next.getMonth()]
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

  const [curExpenses, prevExpenses, curIncome, prevIncome, categoryLimits] = await Promise.all([
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
    supabaseAdmin
      .from('incomes')
      .select('amount_cents')
      .eq('family_id', familyId)
      .eq('status', 'received')
      .gte('date', firstOfMonth(currentYear, currentMonth))
      .lte('date', lastOfMonth(currentYear, currentMonth)),
    supabaseAdmin
      .from('incomes')
      .select('amount_cents')
      .eq('family_id', familyId)
      .eq('status', 'received')
      .gte('date', firstOfMonth(prevYear, prevMonth))
      .lte('date', lastOfMonth(prevYear, prevMonth)),
    supabaseAdmin
      .from('categories')
      .select('name, monthly_limit_cents')
      .eq('family_id', familyId)
      .eq('kind', 'expense')
      .not('monthly_limit_cents', 'is', null),
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

  const limitMap = new Map<string, number>(
    (categoryLimits.data ?? [])
      .filter((c): c is { name: string; monthly_limit_cents: number } => c.monthly_limit_cents !== null)
      .map(c => [c.name, c.monthly_limit_cents])
  )

  const currentData = aggregate((curExpenses.data ?? []) as { category_name: string; amount_cents: number }[])
    .map(c => ({ ...c, limit_cents: limitMap.get(c.category_name) ?? null }))
  const previousData = aggregate((prevExpenses.data ?? []) as { category_name: string; amount_cents: number }[])

  const currentMonthIncome = ((curIncome.data ?? []) as { amount_cents: number }[])
    .reduce((s, r) => s + r.amount_cents, 0)
  const previousMonthIncome = ((prevIncome.data ?? []) as { amount_cents: number }[])
    .reduce((s, r) => s + r.amount_cents, 0)

  return {
    currentMonth: currentData,
    previousMonth: previousData,
    currentPeriodLabel: monthLabel(fmt(currentYear, currentMonth)),
    previousPeriodLabel: monthLabel(fmt(prevYear, prevMonth)),
    currentTotal: currentData.reduce((s, r) => s + r.total_cents, 0),
    previousTotal: previousData.reduce((s, r) => s + r.total_cents, 0),
    currentMonthIncome,
    previousMonthIncome,
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(currentYear, currentMonth, 0).getDate(),
  }
}

const SYSTEM_PROMPT = `Você é um consultor financeiro pessoal especializado em famílias brasileiras. Sua função é revelar padrões, riscos e oportunidades nos dados — não resumir números que o usuário já pode ver.

OBRIGATÓRIO em cada insight:
✓ Quando há renda: expresse o gasto como % da renda ("representa X% da renda")
✓ Quando o mês não acabou: use a projeção fornecida ("no ritmo atual vai fechar em R$X")
✓ Quando há variação: cite o número absoluto E o percentual ("subiu R$250 — 45% a mais que maio")
✓ Encerre com uma ação concreta e específica ("considere X" ou "vale revisar Y")
✓ Quando uma categoria está acima de 80% do limite: sinalize isso claramente

PROIBIDO:
✗ Reafirmar o que já está nos dados: "a família gastou R$809 em supermercado"
✗ Linguagem de dúvida: "pode indicar", "pode ser um sinal", "talvez", "possivelmente"
✗ Conclusões sem ação: "há uma necessidade de revisão dos gastos"
✗ Inventar dados ou fazer suposições além dos dados fornecidos

EXEMPLO RUIM: "A alimentação apresentou aumento significativo com R$809 gastos, o que pode indicar necessidade de revisão."
EXEMPLO BOM: "Supermercado saltou de R$600 para R$809 (+35%) e, no ritmo do dia 9, projeta R$2.700 até o fim de junho — 22% da renda. Defina um teto semanal de R$200 por visita para conter."

Responda somente em português do Brasil.`

function buildInsightPrompt(data: SpendingData, question?: string): string {
  const { dayOfMonth, daysInMonth, currentTotal, previousTotal, currentMonthIncome, previousMonthIncome } = data
  const monthComplete = dayOfMonth >= daysInMonth

  const projectedTotal = !monthComplete && dayOfMonth > 0
    ? Math.round((currentTotal / dayOfMonth) * daysInMonth)
    : null

  const totalVsPrev = previousTotal > 0
    ? ` (${currentTotal > previousTotal ? '+' : ''}${Math.round(((currentTotal - previousTotal) / previousTotal) * 100)}% vs ${data.previousPeriodLabel})`
    : ''

  const incomeContext = currentMonthIncome > 0
    ? `Renda recebida: ${formatBRL(currentMonthIncome)} | Comprometimento atual: ${Math.round((currentTotal / currentMonthIncome) * 100)}% da renda${projectedTotal ? ` | Projeção fim do mês: ${Math.round((projectedTotal / currentMonthIncome) * 100)}% da renda` : ''}`
    : 'Renda do mês: não registrada'

  const prevIncomeContext = previousMonthIncome > 0
    ? `Renda ${data.previousPeriodLabel}: ${formatBRL(previousMonthIncome)}`
    : ''

  const periodHeader = monthComplete
    ? `${data.currentPeriodLabel} (mês completo, ${daysInMonth} dias)`
    : `${data.currentPeriodLabel} — dia ${dayOfMonth} de ${daysInMonth} | Projeção fim do mês: ${projectedTotal ? formatBRL(projectedTotal) : 'indisponível'}`

  const categoryLines = data.currentMonth.map(c => {
    const prev = data.previousMonth.find(p => p.category_name === c.category_name)
    const delta = prev ? ((c.total_cents - prev.total_cents) / prev.total_cents) * 100 : null
    const deltaStr = delta !== null
      ? ` | ${delta > 0 ? '+' : ''}${Math.round(delta)}% vs ${data.previousPeriodLabel} (era ${formatBRL(prev!.total_cents)})`
      : ` | sem dado em ${data.previousPeriodLabel}`
    const pctIncome = currentMonthIncome > 0
      ? ` | ${Math.round((c.total_cents / currentMonthIncome) * 100)}% da renda`
      : ''
    const limitStr = c.limit_cents
      ? ` | LIMITE: ${formatBRL(c.limit_cents)} (${Math.round((c.total_cents / c.limit_cents) * 100)}% usado)`
      : ''
    return `  - ${c.category_name}: ${formatBRL(c.total_cents)} em ${c.count} lançamento${c.count !== 1 ? 's' : ''}${deltaStr}${pctIncome}${limitStr}`
  }).join('\n')

  const previousLines = data.previousMonth.slice(0, 8).map(c =>
    `  - ${c.category_name}: ${formatBRL(c.total_cents)} (${c.count} lançamentos)`
  ).join('\n')

  const base = `PERÍODO: ${periodHeader}
${incomeContext}
${prevIncomeContext ? prevIncomeContext + '\n' : ''}
GASTOS ${data.currentPeriodLabel.toUpperCase()} — Total: ${formatBRL(currentTotal)}${totalVsPrev}
${categoryLines}

GASTOS ${data.previousPeriodLabel.toUpperCase()} — Total: ${formatBRL(previousTotal)}
${previousLines}`

  if (question) {
    return `${base}

Pergunta: ${question}

Responda de forma direta e específica citando valores reais dos dados. Máximo 2 sentenças. Se os dados forem insuficientes, diga claramente.`
  }

  const entriesCount = data.currentMonth.reduce((s, c) => s + c.count, 0)
  const sparseNote = entriesCount < 10
    ? `\nObs: mês atual com poucos lançamentos (${entriesCount}). Se insuficiente para insights relevantes, priorize projeções ou dados do mês anterior.`
    : ''

  return `${base}
${sparseNote}
Gere exatamente 2 insights financeiros independentes e acionáveis para essa família. Cada insight: máximo 2 sentenças diretas. Escolha os 2 dados mais impactantes — anomalias, riscos de limite, tendências preocupantes ou economias expressivas.
Formato de resposta: JSON array com exatamente 2 strings: ["insight 1", "insight 2"]`
}

async function buildForecastInsight(familyId: string): Promise<string | null> {
  try {
    const [forecast, anomalies] = await Promise.all([
      computeNextMonthForecast(familyId),
      detectSpendingAnomalies(familyId),
    ])
    if (forecast.confidence === 'insufficient') return null

    const narrative = await generateForecastNarrative(forecast, anomalies)
    const totalStr = formatBRL(forecast.grandTotal)
    return narrative
      ? `📊 Previsão para ${nextMonthLabel()}: ${narrative}`
      : `📊 Previsão para ${nextMonthLabel()}: você deve gastar aproximadamente ${totalStr}.`
  } catch {
    return null
  }
}

export async function generateProactiveInsights(familyId: string, includeForecast = false): Promise<string[]> {
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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return []

  let insights: string[]
  try {
    const json = await response.json()
    const content: string = json.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\[[\s\S]*\]/)
    if (!match) { console.warn('[AI] proactive insights: expected JSON array, got raw text'); return [] }
    const parsed = JSON.parse(match[0])
    insights = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }

  if (includeForecast && insights.length > 0) {
    const forecastInsight = await buildForecastInsight(familyId)
    if (forecastInsight) insights.push(forecastInsight)
  }

  return insights
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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
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
