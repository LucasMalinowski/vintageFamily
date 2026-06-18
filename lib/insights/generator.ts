import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatBRL } from '@/lib/money'
import { computeNextMonthForecast } from '@/lib/forecast/engine'
import { detectSpendingAnomalies } from '@/lib/forecast/anomaly'
import { generateForecastNarrative } from '@/lib/forecast/narrator'
import { getTranslations } from 'next-intl/server'
import type { AppLocale } from '@/lib/i18n/getLocale'

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

const INTL_LOCALE: Record<AppLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function monthLabel(yyyyMM: string, locale: AppLocale): string {
  const [, m] = yyyyMM.split('-').map(Number)
  if (!m) return yyyyMM
  const date = new Date(2000, m - 1, 1)
  return capitalize(new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(date))
}

function nextMonthLabel(locale: AppLocale): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return capitalize(new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(next))
}

async function fetchSpendingData(familyId: string, locale: AppLocale = 'pt-BR'): Promise<SpendingData> {
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
    currentPeriodLabel: monthLabel(fmt(currentYear, currentMonth), locale),
    previousPeriodLabel: monthLabel(fmt(prevYear, prevMonth), locale),
    currentTotal: currentData.reduce((s, r) => s + r.total_cents, 0),
    previousTotal: previousData.reduce((s, r) => s + r.total_cents, 0),
    currentMonthIncome,
    previousMonthIncome,
    dayOfMonth: now.getDate(),
    daysInMonth: new Date(currentYear, currentMonth, 0).getDate(),
  }
}

const SYSTEM_PROMPTS: Record<AppLocale, string> = {
  'pt-BR': `Você é um consultor financeiro pessoal especializado em famílias brasileiras. Sua função é revelar padrões, riscos e oportunidades nos dados — não resumir números que o usuário já pode ver.

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

Responda somente em português do Brasil.`,
  en: `You are a personal financial advisor for families. Your job is to surface patterns, risks and opportunities in the data — not to restate numbers the user can already see.

REQUIRED in every insight:
✓ When income is available: express spending as % of income ("represents X% of income")
✓ When the month isn't over: use the provided projection ("at the current pace it will close around $X")
✓ When there's a variation: cite the absolute number AND the percentage ("up $250 — 45% more than last month")
✓ End with a concrete, specific action ("consider X" or "it's worth reviewing Y")
✓ When a category is above 80% of its limit: flag it clearly

FORBIDDEN:
✗ Restating what's already in the data: "the family spent $809 on groceries"
✗ Hedging language: "may indicate", "could be a sign", "maybe", "possibly"
✗ Conclusions without action: "there's a need to review spending"
✗ Inventing data or making assumptions beyond what's provided

BAD EXAMPLE: "Groceries showed a significant increase with $809 spent, which may indicate a need for review."
GOOD EXAMPLE: "Groceries jumped from $600 to $809 (+35%) and, at the current pace as of day 9, projects $2,700 by the end of the month — 22% of income. Set a weekly cap of $200 per trip to rein it in."

Respond only in English.`,
  es: `Eres un asesor financiero personal para familias. Tu función es revelar patrones, riesgos y oportunidades en los datos — no resumir números que el usuario ya puede ver.

OBLIGATORIO en cada insight:
✓ Cuando hay ingresos: expresa el gasto como % del ingreso ("representa X% del ingreso")
✓ Cuando el mes no ha terminado: usa la proyección proporcionada ("al ritmo actual cerrará en $X")
✓ Cuando hay variación: cita el número absoluto Y el porcentaje ("subió $250 — 45% más que el mes pasado")
✓ Termina con una acción concreta y específica ("considera X" o "vale la pena revisar Y")
✓ Cuando una categoría está por encima del 80% del límite: señálalo claramente

PROHIBIDO:
✗ Reafirmar lo que ya está en los datos: "la familia gastó $809 en supermercado"
✗ Lenguaje de duda: "puede indicar", "podría ser una señal", "tal vez", "posiblemente"
✗ Conclusiones sin acción: "hay una necesidad de revisar los gastos"
✗ Inventar datos o hacer suposiciones más allá de los datos proporcionados

EJEMPLO MALO: "La alimentación mostró un aumento significativo con $809 gastados, lo que puede indicar necesidad de revisión."
EJEMPLO BUENO: "Supermercado saltó de $600 a $809 (+35%) y, al ritmo del día 9, proyecta $2.700 para fin de mes — 22% del ingreso. Define un tope semanal de $200 por visita para contenerlo."

Responde solamente en español.`,
}

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

async function buildForecastInsight(familyId: string, locale: AppLocale): Promise<string | null> {
  try {
    const [forecast, anomalies] = await Promise.all([
      computeNextMonthForecast(familyId),
      detectSpendingAnomalies(familyId, 12, locale),
    ])
    if (forecast.confidence === 'insufficient') return null

    const narrative = await generateForecastNarrative(forecast, anomalies, locale)
    const totalStr = formatBRL(forecast.grandTotal)
    const label = nextMonthLabel(locale)
    const t = await getTranslations({ locale, namespace: 'insights' })
    return narrative
      ? `📊 ${t('forecastFor', { month: label })}: ${narrative}`
      : `📊 ${t('forecastFor', { month: label })}: ${t('forecastApprox', { amount: totalStr })}`
  } catch {
    return null
  }
}

export async function generateProactiveInsights(familyId: string, includeForecast = false, locale: AppLocale = 'pt-BR'): Promise<string[]> {
  const data = await fetchSpendingData(familyId, locale)

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
          { role: 'system', content: SYSTEM_PROMPTS[locale] },
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
    const forecastInsight = await buildForecastInsight(familyId, locale)
    if (forecastInsight) insights.push(forecastInsight)
  }

  return insights
}

export async function generateOnDemandInsight(familyId: string, question: string, locale: AppLocale = 'pt-BR'): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'insights' })
  const data = await fetchSpendingData(familyId, locale)
  const prompt = buildInsightPrompt(data, question)
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return t('aiUnavailable')

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
          { role: 'system', content: SYSTEM_PROMPTS[locale] },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    })
  } catch {
    return t('generateFailedRetry')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return t('generateFailed')

  const json = await response.json()
  return (json.choices?.[0]?.message?.content ?? '').trim() || t('insufficientData')
}
