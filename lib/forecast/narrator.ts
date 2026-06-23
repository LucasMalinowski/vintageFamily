import { type ForecastResult } from './engine'
import { type AnomalyFlag } from './anomaly'
import { formatMoney } from '@/lib/money'
import type { AppLocale } from '@/lib/i18n/getLocale'

const INTL_LOCALE: Record<AppLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

function monthName(yyyyMM: string, locale: AppLocale): string {
  const m = parseInt(yyyyMM.split('-')[1], 10)
  if (!m) return yyyyMM
  const date = new Date(2000, m - 1, 1)
  const name = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'long' }).format(date)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const SYSTEM_PROMPTS: Record<AppLocale, string> = {
  'pt-BR': 'Você é um assistente financeiro direto. Responde em português do Brasil. Apenas 1 frase objetiva, sem rodeios.',
  en: 'You are a direct financial assistant. Respond in English. Just 1 objective sentence, no fluff.',
  es: 'Eres un asistente financiero directo. Responde en español. Solo 1 frase objetiva, sin rodeos.',
}

const LANGUAGE_INSTRUCTIONS: Record<AppLocale, string> = {
  'pt-BR': 'Escreva exatamente 1 frase curta e direta (máximo 18 palavras) em português do Brasil explicando a previsão. Mencione o valor total e o principal fator que mais contribui. Sem introdução, sem "A previsão é", comece direto no conteúdo.',
  en: 'Write exactly 1 short, direct sentence (maximum 18 words) in English explaining the forecast. Mention the total amount and the main contributing factor. No introduction, no "The forecast is", start directly with the content.',
  es: 'Escribe exactamente 1 frase corta y directa (máximo 18 palabras) en español explicando la previsión. Menciona el monto total y el principal factor que más contribuye. Sin introducción, sin "La previsión es", empieza directo en el contenido.',
}

export async function generateForecastNarrative(
  forecast: ForecastResult,
  anomalies: AnomalyFlag[],
  locale: AppLocale = 'pt-BR',
  currency: string = 'BRL',
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return ''
  if (forecast.confidence === 'insufficient') return ''

  const targetName = monthName(forecast.targetMonth, locale)
  const anomalyContext = anomalies
    .filter(a => !a.alreadyConfirmed)
    .slice(0, 2)
    .map(a => `${a.category_name} teve pico histórico de ${formatMoney(a.amount_cents, currency, locale)} no mês ${monthName(a.month, locale)} (z-score ${a.zScore.toFixed(1)})`)
    .join('; ')

  const prompt = `Dados para previsão de ${targetName}:
- Total estimado: ${formatMoney(forecast.grandTotal, currency, locale)}
- Gastos fixos (recorrentes confirmados): ${formatMoney(forecast.fixedTotal, currency, locale)}
- Parcelas em andamento: ${formatMoney(forecast.installmentsTotal, currency, locale)}
- Gastos variáveis projetados: ${formatMoney(forecast.variableEstimate, currency, locale)}
- Eventos anuais confirmados: ${formatMoney(forecast.annualEventsTotal, currency, locale)}
- Confiança da previsão: ${forecast.confidence}
${anomalyContext ? `- Anomalias históricas: ${anomalyContext}` : ''}

${LANGUAGE_INSTRUCTIONS[locale]}`

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
            content: SYSTEM_PROMPTS[locale],
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
