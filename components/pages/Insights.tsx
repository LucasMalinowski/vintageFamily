'use client'

import { useEffect, useRef, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { Lightbulb, MessageCircleQuestion, Share2, Sparkles, Lock, Flag } from 'lucide-react'
import { usePlan } from '@/lib/billing/plan-context'

type InsightRow = {
  id: string
  type: 'proactive' | 'on_demand'
  prompt_question: string | null
  content: string
  created_at: string
  sent_channels: string[]
}

function formatRelative(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
  if (diff < 60) return `${diff}min atrás`
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`
  return `${Math.floor(diff / 1440)}d atrás`
}

async function reportInsightError(insightId: string, content: string, setReporting: (id: string | null) => void, setReported: (fn: (prev: Set<string>) => Set<string>) => void) {
  setReporting(insightId)
  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bug',
        location: 'insights',
        description: `Insight incorreto reportado pelo usuário.\n\nConteúdo:\n${content.slice(0, 500)}`,
      }),
    })
    setReported((prev) => new Set(prev).add(insightId))
  } finally {
    setReporting(null)
  }
}

async function shareInsight(content: string) {
  const text = `💡 Insight financeiro do Florim:\n\n${content}\n\nhttps://florim.app`
  if (navigator.share) {
    await navigator.share({ text })
  } else {
    await navigator.clipboard.writeText(text)
    alert('Insight copiado para a área de transferência!')
  }
}

export default function InsightsPage() {
  const { familyId } = useAuth()
  const { tier } = usePlan()
  const hasFullInsightAccess = tier === 'paid' || tier === 'trial'

  const [insights, setInsights] = useState<InsightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [onDemandUsed, setOnDemandUsed] = useState(0)
  const [onDemandLimit, setOnDemandLimit] = useState(3)

  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!familyId) return
    loadInsights()
  }, [familyId])

  async function loadInsights() {
    setLoading(true)
    const res = await fetch('/api/insights')
    if (res.ok) {
      const data = await res.json()
      setInsights(data.insights ?? [])
      setOnDemandUsed(data.onDemandUsed ?? 0)
      setOnDemandLimit(data.onDemandLimit ?? 3)
    }
    setLoading(false)
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return

    setAsking(true)
    setAskError(null)

    const res = await fetch('/api/insights/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    })

    const data = await res.json()

    if (!res.ok) {
      setAskError(data.error ?? 'Erro ao gerar insight.')
    } else {
      setQuestion('')
      await loadInsights()
    }

    setAsking(false)
  }

  const onDemandRemaining = Math.max(0, onDemandLimit - onDemandUsed)

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <Topbar
        title="Insights"
        subtitle="Análises inteligentes das suas finanças."
        showBackButton
      />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-2xl w-full mx-auto space-y-6">

        {/* On-demand ask box */}
        <div className="bg-bg border border-border rounded-vintage shadow-vintage p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="w-5 h-5 text-petrol" />
            <h2 className="font-serif text-base text-ink">Perguntar sobre minhas finanças</h2>
          </div>
          {!hasFullInsightAccess && (
            <p className="text-xs text-ink/50">
              {onDemandRemaining} pergunta{onDemandRemaining !== 1 ? 's' : ''} restante{onDemandRemaining !== 1 ? 's' : ''} este mês
              {` (plano gratuito: ${onDemandLimit}/mês)`}
            </p>
          )}
          <form onSubmit={handleAsk} className="space-y-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Ex: Como posso economizar em alimentação? Qual meu maior gasto esse mês?"
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-paper-2/50 resize-none transition-vintage"
              disabled={asking || (!hasFullInsightAccess && onDemandRemaining === 0)}
            />
            {askError && <p className="text-xs text-terracotta">{askError}</p>}
            <button
              type="submit"
              disabled={asking || !question.trim() || (!hasFullInsightAccess && onDemandRemaining === 0)}
              className="w-full py-2.5 bg-coffee text-paper rounded-lg text-sm font-semibold hover:bg-coffee/90 transition-vintage disabled:opacity-50"
            >
              {asking ? 'Analisando...' : 'Gerar insight'}
            </button>
          </form>
          {onDemandRemaining === 0 && !hasFullInsightAccess && (
            <div className="flex items-start gap-2 p-3 bg-gold/10 border border-gold/30 rounded-lg">
              <Lock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-xs text-ink/70">
                Você atingiu o limite mensal do plano gratuito.{' '}
                <a href="/settings/billing" className="text-coffee font-medium underline">
                  Assine o plano Pro
                </a>{' '}
                para perguntas ilimitadas.
              </p>
            </div>
          )}
        </div>

        {/* Insights list */}
        {loading ? (
          <div className="py-12 text-center text-ink/50 text-sm">Carregando...</div>
        ) : insights.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="w-10 h-10 text-gold" />}
            message="Nenhum insight ainda"
            submessage="Faça uma pergunta acima ou aguarde o próximo envio automático."
          />
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="bg-bg border border-border rounded-vintage shadow-vintage p-4 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {insight.type === 'proactive' ? (
                      <Sparkles className="w-4 h-4 text-gold shrink-0" />
                    ) : (
                      <MessageCircleQuestion className="w-4 h-4 text-petrol shrink-0" />
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      insight.type === 'proactive'
                        ? 'bg-gold/15 text-gold'
                        : 'bg-petrol/10 text-petrol'
                    }`}>
                      {insight.type === 'proactive' ? 'Proativo' : 'Sob demanda'}
                    </span>
                  </div>
                  <span className="text-xs text-ink/40 shrink-0">{formatRelative(insight.created_at)}</span>
                </div>

                {/* Question (on-demand only) */}
                {insight.prompt_question && (
                  <p className="text-xs text-ink/50 italic border-l-2 border-petrol/30 pl-2">
                    "{insight.prompt_question}"
                  </p>
                )}

                {/* Content */}
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{insight.content}</p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5 text-xs text-ink/30">
                    {insight.sent_channels.map((ch) => (
                      <span key={ch} className="capitalize">{ch === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {reportedIds.has(insight.id) ? (
                      <span className="text-xs text-ink/30">Reportado</span>
                    ) : (
                      <button
                        type="button"
                        disabled={reportingId === insight.id}
                        onClick={() => reportInsightError(insight.id, insight.content, setReportingId, setReportedIds)}
                        className="flex items-center gap-1 text-xs text-ink/30 hover:text-terracotta transition-vintage disabled:opacity-50"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Reportar erro
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => shareInsight(insight.content)}
                      className="flex items-center gap-1 text-xs text-ink/40 hover:text-ink/70 transition-vintage"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Compartilhar
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!hasFullInsightAccess && (
              <div className="text-center py-3">
                <p className="text-xs text-ink/40">
                  Histórico completo disponível no{' '}
                  <a href="/settings/billing" className="text-coffee underline">plano Pro</a>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="hidden md:block mt-auto w-full">
        <div className="h-[56px] bg-paper flex items-center justify-center px-6">
          <p className="text-center text-[13px] text-gold italic">
            Entender o dinheiro é o primeiro passo para a liberdade.
          </p>
        </div>
      </footer>
    </div>
  )
}
