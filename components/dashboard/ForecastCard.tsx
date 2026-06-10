'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/lib/money'

type Confidence = 'high' | 'medium' | 'low' | 'insufficient'

type ForecastResult = {
  targetMonth: string
  fixedTotal: number
  installmentsTotal: number
  variableEstimate: number
  annualEventsTotal: number
  grandTotal: number
  confidence: Confidence
  monthlyHistory: { month: string; total: number; variable: number }[]
}

type AnomalyFlag = {
  category_name: string
  category_id: string | null
  month: string
  amount_cents: number
  zScore: number
  alreadyConfirmed: boolean
}

const CONFIDENCE_BADGE: Record<Confidence, { label: string; className: string }> = {
  high:         { label: 'Boa previsão',    className: 'bg-olive/15 text-olive' },
  medium:       { label: 'Previsão média',  className: 'bg-gold/20 text-[#8a6d35]' },
  low:          { label: 'Poucos dados',    className: 'bg-terracotta/15 text-terracotta' },
  insufficient: { label: 'Sem dados',       className: 'bg-ink/10 text-ink/50' },
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function monthName(yyyyMM: string): string {
  const m = parseInt(yyyyMM.split('-')[1], 10)
  return MONTHS_PT[m - 1] ?? yyyyMM
}

export default function ForecastCard() {
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([])
  const [narrative, setNarrative] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setLoading(false); return }

      try {
        const res = await fetch('/api/forecast', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setForecast(data.forecast)
        setAnomalies((data.anomalies ?? []).filter((a: AnomalyFlag) => !a.alreadyConfirmed))
        setNarrative(data.narrative ?? '')
      } catch {
        // silently fail — card stays hidden
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function confirmAnnual(anomaly: AnomalyFlag) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    setDismissedAnomalies(prev => new Set([...prev, anomaly.category_name]))

    await fetch('/api/forecast/confirm-annual', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_name: anomaly.category_name,
        category_id: anomaly.category_id,
        typical_month: parseInt(anomaly.month.split('-')[1], 10),
        typical_amount_cents: anomaly.amount_cents,
        description: anomaly.category_name,
      }),
    })
  }

  function dismissAnomaly(catName: string) {
    setDismissedAnomalies(prev => new Set([...prev, catName]))
  }

  if (loading) {
    return (
      <div className="bg-bg rounded-[14px] border border-border p-5 animate-pulse">
        <div className="h-3 w-24 bg-border rounded mb-3" />
        <div className="h-8 w-36 bg-border rounded mb-2" />
        <div className="h-3 w-48 bg-border rounded" />
      </div>
    )
  }

  if (!forecast) return null

  const badge = CONFIDENCE_BADGE[forecast.confidence]
  const pendingAnomalies = anomalies.filter(a => !dismissedAnomalies.has(a.category_name)).slice(0, 2)

  const breakdownItems = [
    { label: 'Fixos recorrentes', value: forecast.fixedTotal },
    { label: 'Parcelas em curso', value: forecast.installmentsTotal },
    { label: 'Variáveis (estimado)', value: forecast.variableEstimate },
    { label: 'Eventos sazonais', value: forecast.annualEventsTotal },
  ].filter(item => item.value > 0)

  return (
    <div className="bg-bg rounded-[14px] border border-border overflow-hidden">
      {/* Header accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3E5F4B, #C2A45D)' }} />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-coffee" />
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink/50">
              Previsão · {monthName(forecast.targetMonth)}
            </span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Grand total */}
        <p className="font-numbers font-bold text-[34px] text-ink leading-none tracking-[-1px] tabular-nums mb-1">
          {formatBRL(forecast.grandTotal)}
        </p>

        {/* Low-confidence warning */}
        {(forecast.confidence === 'insufficient' || forecast.confidence === 'low') && (
          <p className="text-[12px] text-terracotta leading-snug mt-2 mb-3 bg-terracotta/10 rounded-lg px-3 py-2">
            ⚠️ Estimativa preliminar — ainda não temos dados suficientes dos meses anteriores para um cálculo
            preciso. Conforme você for registrando despesas, a previsão fica mais precisa.
          </p>
        )}

        {/* AI narrative */}
        {narrative && (
          <p className="text-[13px] text-ink/60 italic leading-snug mt-2 mb-3">
            {narrative}
          </p>
        )}

        {/* Expand toggle */}
        {breakdownItems.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[11px] text-petrol font-medium mt-2"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
        )}

        {/* Breakdown */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            {breakdownItems.map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-[12px] text-ink/60">{item.label}</span>
                <span className="text-[12px] font-semibold font-numbers tabular-nums text-ink">
                  {formatBRL(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anomaly confirmation prompts */}
      {pendingAnomalies.length > 0 && (
        <div className="border-t border-border/50 px-5 py-4 space-y-3 bg-gold/5">
          {pendingAnomalies.map(anomaly => (
            <div key={anomaly.category_name}>
              <p className="text-[12px] text-ink/70 leading-snug mb-2">
                <span className="font-semibold text-ink">{anomaly.category_name}</span> em{' '}
                {monthName(anomaly.month)} foi {formatBRL(anomaly.amount_cents)} acima do normal.
                Isso se repete todo ano?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmAnnual(anomaly)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-coffee text-paper"
                >
                  Sim, é anual
                </button>
                <button
                  onClick={() => dismissAnomaly(anomaly.category_name)}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-border text-ink/60"
                >
                  Foi pontual
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
