import { type ForecastResult } from './engine'
import { type AnomalyFlag } from './anomaly'
import { formatBRL } from '@/lib/money'

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function monthName(yyyyMM: string): string {
  const m = parseInt(yyyyMM.split('-')[1], 10)
  return MONTH_NAMES_PT[m - 1] ?? yyyyMM
}

export async function generateForecastNarrative(
  forecast: ForecastResult,
  anomalies: AnomalyFlag[],
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return ''
  if (forecast.confidence === 'insufficient') return ''

  const targetName = monthName(forecast.targetMonth)
  const anomalyContext = anomalies
    .filter(a => !a.alreadyConfirmed)
    .slice(0, 2)
    .map(a => `${a.category_name} teve pico histórico de ${formatBRL(a.amount_cents)} no mês ${monthName(a.month)} (z-score ${a.zScore.toFixed(1)})`)
    .join('; ')

  const prompt = `Dados para previsão de ${targetName}:
- Total estimado: ${formatBRL(forecast.grandTotal)}
- Gastos fixos (recorrentes confirmados): ${formatBRL(forecast.fixedTotal)}
- Parcelas em andamento: ${formatBRL(forecast.installmentsTotal)}
- Gastos variáveis projetados: ${formatBRL(forecast.variableEstimate)}
- Eventos anuais confirmados: ${formatBRL(forecast.annualEventsTotal)}
- Confiança da previsão: ${forecast.confidence}
${anomalyContext ? `- Anomalias históricas: ${anomalyContext}` : ''}

Escreva exatamente 1 frase curta e direta (máximo 18 palavras) em português do Brasil explicando a previsão. Mencione o valor total e o principal fator que mais contribui. Sem introdução, sem "A previsão é", comece direto no conteúdo.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  let response: Response
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente financeiro direto. Responde em português do Brasil. Apenas 1 frase objetiva, sem rodeios.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 80,
      }),
    })
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) return ''

  try {
    const json = await response.json()
    return (json.choices?.[0]?.message?.content ?? '').trim()
  } catch {
    return ''
  }
}
