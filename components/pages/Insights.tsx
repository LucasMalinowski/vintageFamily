'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import EmptyState from '@/components/ui/EmptyState'
import AnalyticsKpiCard from '@/components/ui/AnalyticsKpiCard'
import { useAuth } from '@/components/AuthProvider'
import { Flag, Lightbulb, MessageCircleQuestion, Share2, Sparkles, TrendingDown } from 'lucide-react'
import { usePlan } from '@/lib/billing/plan-context'
import { supabase } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

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
  }
}

export default function InsightsPage() {
  const { familyId, user } = useAuth()
  const { tier } = usePlan()
  const t = useTranslations()
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

  // Real preferences from DB
  const [channels, setChannels] = useState<string[]>(['whatsapp', 'email'])
  const [prefSaving, setPrefSaving] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function loadInsights() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setLoading(false); return }
    const res = await fetch('/api/insights', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setInsights(data.insights ?? [])
      setOnDemandUsed(data.onDemandUsed ?? 0)
      setOnDemandLimit(data.onDemandLimit ?? 3)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!familyId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInsights()
  }, [familyId])

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('insight_channels')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.insight_channels?.length) setChannels(data.insight_channels)
      })
  }, [user])

  async function toggleChannel(ch: string) {
    const next = channels.includes(ch) ? channels.filter(c => c !== ch) : [...channels, ch]
    setChannels(next)
    if (!user) return
    setPrefSaving(true)
    await supabase.from('users').update({ insight_channels: next }).eq('id', user.id)
    setPrefSaving(false)
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q) return

    setAsking(true)
    setAskError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setAsking(false); return }
    const res = await fetch('/api/insights/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  const proactiveCount = insights.filter(i => i.type === 'proactive').length

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <Topbar
        title={t('insights.title')}
        subtitle={t('insights.subtitle')}
        accent="#3F6E7A"
        showBackButton
      />

      {/* 2-column layout on desktop */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-6 py-5 md:grid md:gap-6" style={{ gridTemplateColumns: '1fr 300px' }}>

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Ask box */}
            <div className="bg-white rounded-xl border border-border shadow-soft p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <MessageCircleQuestion className="w-5 h-5 text-petrol" />
                  <h2 className="font-serif text-[18px] text-ink font-medium">Perguntar sobre suas finanças</h2>
                </div>
                {!hasFullInsightAccess && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: 'rgba(194,164,93,0.15)', color: '#A58E5F' }}
                  >
                    {onDemandRemaining} de {onDemandLimit} perguntas restantes este mês
                  </span>
                )}
              </div>
              <form onSubmit={handleAsk} className="space-y-3">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  placeholder={t('insights.questionPlaceholder')}
                  aria-label="Pergunta para análise financeira"
                  className="w-full px-4 py-3 bg-paper border border-border rounded-[10px] text-[14px] text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-petrol/20 resize-none transition-vintage"
                  disabled={asking || (!hasFullInsightAccess && onDemandRemaining === 0)}
                />
                {askError && <p className="text-xs text-[#B05C3A]">{askError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={asking || !question.trim() || (!hasFullInsightAccess && onDemandRemaining === 0)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-coffee text-paper rounded-[10px] text-[14px] font-semibold hover:bg-coffee/90 transition-vintage disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {asking ? t('insights.generating') : t('insights.generateInsight')}
                  </button>
                  <p className="text-[12px] text-ink/45 italic">
                    Sua pergunta é processada nos seus dados, privada por padrão.
                  </p>
                </div>
              </form>
              {onDemandRemaining === 0 && !hasFullInsightAccess && (
                <div className="flex items-start gap-2 p-3 mt-3 rounded-lg border" style={{ background: 'rgba(194,164,93,0.08)', borderColor: 'rgba(194,164,93,0.25)' }}>
                  <span className="text-[14px] mt-0.5 shrink-0" style={{ color: '#A58E5F' }}>🔒</span>
                  <p className="text-[12px] text-ink/70">
                    Você atingiu o limite mensal do plano gratuito.{' '}
                    <Link href="/settings/billing" className="text-coffee font-medium underline">
                      Assine o plano Pro
                    </Link>{' '}
                    para perguntas ilimitadas.
                  </p>
                </div>
              )}
            </div>

            {/* Section label */}
            {!loading && insights.length > 0 && (
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-px bg-coffee/40" />
                <span className="text-[10.5px] tracking-[0.18em] uppercase font-semibold text-coffee/70">
                  Insights recentes
                </span>
              </div>
            )}

            {/* Insight cards */}
            {loading ? (
              <div className="py-12 text-center text-ink/50 text-[13px]">{t('insights.loading')}</div>
            ) : insights.length === 0 ? (
              <EmptyState
                icon={<Lightbulb className="w-10 h-10 text-gold" />}
                message={t('insights.emptyState')}
                submessage={t('insights.emptyStateSubmessage')}
              />
            ) : (
              <div className="space-y-4">
                {insights.map((insight) => {
                  const isAsk = insight.type === 'on_demand'
                  return (
                    <div key={insight.id} className="bg-white rounded-xl border border-border shadow-soft p-5">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                          style={isAsk
                            ? { background: 'rgba(47,111,126,0.12)', color: '#3F6E7A' }
                            : { background: 'rgba(194,164,93,0.18)', color: '#A58E5F' }
                          }
                        >
                          {isAsk
                            ? <MessageCircleQuestion className="w-[18px] h-[18px]" />
                            : <Lightbulb className="w-[18px] h-[18px]" />
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Meta row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className="text-[10px] font-bold tracking-[0.10em] uppercase"
                              style={{ color: isAsk ? '#3F6E7A' : '#A58E5F' }}
                            >
                              {isAsk ? 'Sua pergunta' : 'Análise automática'}
                            </span>
                            <span className="text-[11.5px] text-ink/45">· {formatRelative(insight.created_at)}</span>
                            <div className="flex-1" />
                            {insight.sent_channels.map((ch) => (
                              <span key={ch} className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-ink/[0.06] text-ink/50">
                                {ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : ch}
                              </span>
                            ))}
                          </div>

                          {/* Question quote (on-demand) */}
                          {insight.prompt_question && (
                            <div
                              className="px-3 py-2.5 rounded-[6px] border-l-[3px] mb-3 text-[13.5px] text-ink font-serif italic"
                              style={{ background: 'rgba(47,111,126,0.06)', borderColor: '#3F6E7A' }}
                            >
                              &ldquo;{insight.prompt_question}&rdquo;
                            </div>
                          )}

                          {/* Title for proactive */}
                          {insight.type === 'proactive' && insight.content.split('\n')[0] && (
                            <h3 className="font-serif text-[18px] text-coffee mb-2 leading-snug font-medium">
                              {insight.content.split('\n')[0].slice(0, 80)}
                            </h3>
                          )}

                          {/* Content */}
                          <p className="text-[14px] text-ink leading-relaxed">{insight.content}</p>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => shareInsight(insight.content)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border bg-white text-[12px] text-ink/70 hover:bg-paper transition-vintage"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Compartilhar
                            </button>
                            {reportedIds.has(insight.id) ? (
                              <span className="text-[12px] text-ink/30">Reportado</span>
                            ) : (
                              <button
                                type="button"
                                disabled={reportingId === insight.id}
                                onClick={() => reportInsightError(insight.id, insight.content, setReportingId, setReportedIds)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border bg-white text-[12px] text-ink/50 hover:bg-paper transition-vintage disabled:opacity-50"
                              >
                                <Flag className="w-3.5 h-3.5" /> Reportar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right sidebar — desktop only ── */}
          <div className="hidden md:flex flex-col gap-4 mt-0">
            <AnalyticsKpiCard
              label={t('insights.title')}
              value={String(insights.length)}
              sub={`${proactiveCount} automáticos · ${onDemandUsed} perguntas`}
              iconTheme="purple"
              icon={Sparkles}
            />

            {/* Preferências */}
            <div className="bg-white rounded-xl border border-border shadow-soft p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-[16px] text-coffee">Preferências</h3>
                {prefSaving && <span className="text-[11px] text-ink/40">Salvando…</span>}
              </div>
              <div className="space-y-0">
                {[
                  { label: t('insights.channel.email'), ch: 'email', desc: t('settings.insights.channels.emailDesc') },
                  { label: t('insights.channel.whatsapp'), ch: 'whatsapp', desc: t('settings.insights.channels.whatsappDesc') },
                ].map((p) => (
                  <div
                    key={p.ch}
                    className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-ink">{p.label}</p>
                      <p className="text-[11px] text-ink/45">{p.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleChannel(p.ch)}
                      className="relative w-8 h-[18px] rounded-full transition-colors shrink-0"
                      style={{ background: channels.includes(p.ch) ? '#6FBF8A' : '#E4D7C2' }}
                      aria-label={p.label}
                    >
                      <span
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all"
                        style={{ left: channels.includes(p.ch) ? '18px' : '2px' }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {!hasFullInsightAccess && (
                <div
                  className="mt-3 flex items-center gap-2 p-2.5 rounded-lg border"
                  style={{ background: 'rgba(194,164,93,0.08)', borderColor: 'rgba(194,164,93,0.25)' }}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: '#A58E5F' }} />
                  <p className="text-[12px] text-ink/70 flex-1">
                    Pro: perguntas ilimitadas + histórico completo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
