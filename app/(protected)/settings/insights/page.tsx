'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { usePlan } from '@/lib/billing/plan-context'
import Modal from '@/components/ui/Modal'
import { Lock } from 'lucide-react'

export default function InsightsSettingsPage() {
  const { user } = useAuth()
  const { tier } = usePlan()
  const hasFullInsightAccess = tier === 'paid' || tier === 'trial'

  const [insightsEnabled, setInsightsEnabled] = useState(true)
  const [intervalDays, setIntervalDays] = useState(30)
  const [channels, setChannels] = useState<string[]>(['whatsapp', 'email'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upsellOpen, setUpsellOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('insights_enabled,insight_interval_days,insight_channels')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setInsightsEnabled(data.insights_enabled ?? true)
          setIntervalDays(data.insight_interval_days ?? 30)
          setChannels(data.insight_channels ?? ['whatsapp', 'email'])
        }
        setLoading(false)
      })
  }, [user])

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    )
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    await supabase
      .from('users')
      .update({
        insights_enabled: insightsEnabled,
        insight_interval_days: hasFullInsightAccess ? Math.max(3, intervalDays) : 30,
        insight_channels: channels,
      })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="py-12 text-center text-ink/50 text-sm">Carregando...</div>

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-serif text-ink">Preferências de Insights</h2>
        <p className="text-sm text-ink/60 mt-1">
          Configure como e quando receber análises inteligentes das suas finanças.
        </p>
      </div>

      {/* Enable/disable */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Insights proativos</p>
            <p className="text-xs text-ink/50 mt-0.5">Receber análises automáticas periodicamente</p>
          </div>
          <button
            type="button"
            onClick={() => setInsightsEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              insightsEnabled ? 'bg-coffee' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                insightsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!insightsEnabled && (
          <p className="text-xs text-ink/40 bg-paper rounded p-2">
            Você não receberá insights automáticos. Você ainda pode pedir insights sob demanda.
          </p>
        )}
      </div>

      {/* Interval */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-ink">Frequência</p>
              {!hasFullInsightAccess && <Lock className="w-3.5 h-3.5 text-gold" />}
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              {hasFullInsightAccess ? 'Dias mínimos entre insights (mín. 3)' : 'Disponível no plano Pro'}
            </p>
          </div>
          <input
            type="number"
            min={3}
            max={365}
            value={intervalDays}
            onChange={(e) => {
              if (!hasFullInsightAccess) { setUpsellOpen(true); return }
              setIntervalDays(Math.max(3, Number(e.target.value)))
            }}
            onFocus={() => { if (!hasFullInsightAccess) setUpsellOpen(true) }}
            className={`w-20 px-3 py-2 border rounded-lg text-sm text-center transition-vintage focus:outline-none ${
              hasFullInsightAccess
                ? 'border-border bg-paper text-ink focus:ring-2 focus:ring-paper-2/50'
                : 'border-border bg-paper/60 text-ink/40 cursor-not-allowed'
            }`}
            readOnly={!hasFullInsightAccess}
          />
        </div>
        <p className="text-xs text-ink/30">
          {hasFullInsightAccess ? `Insights a cada ${intervalDays} dia${intervalDays !== 1 ? 's' : ''} no mínimo.` : 'Plano gratuito: 2 insights automáticos por mês.'}
        </p>
      </div>

      {/* Channels */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <p className="text-sm font-medium text-ink">Canais de entrega</p>
        <div className="space-y-2">
          {[
            { value: 'whatsapp', label: 'WhatsApp', desc: 'Enviar no WhatsApp vinculado' },
            { value: 'email', label: 'E-mail', desc: 'Enviar no e-mail da conta' },
          ].map(({ value, label, desc }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={channels.includes(value)}
                onChange={() => toggleChannel(value)}
                className="w-4 h-4 rounded border-border"
              />
              <div>
                <p className="text-sm text-ink">{label}</p>
                <p className="text-xs text-ink/50">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="bg-coffee text-paper px-5 py-2.5 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50 text-sm"
      >
        {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar preferências'}
      </button>

      {/* Upsell modal */}
      <Modal isOpen={upsellOpen} onClose={() => setUpsellOpen(false)} title="Recurso Pro">
        <div className="space-y-4">
          <p className="text-sm text-ink/70">
            A configuração de frequência de insights é exclusiva do teste gratuito e do plano <strong>Florim Pro</strong>. Com ele você pode receber análises com a frequência que quiser — a partir de 3 dias.
          </p>
          <p className="text-sm text-ink/70">
            No plano gratuito, você recebe 2 insights automáticos por mês.
          </p>
          <a
            href="/settings/billing"
            className="block w-full text-center py-3 bg-coffee text-paper rounded-lg text-sm font-semibold hover:bg-coffee/90 transition-vintage"
          >
            Ver planos — a partir de R$19,90/mês
          </a>
          <button
            type="button"
            onClick={() => setUpsellOpen(false)}
            className="block w-full text-center py-2 text-sm text-ink/50 hover:text-ink transition-vintage"
          >
            Continuar no plano gratuito
          </button>
        </div>
      </Modal>
    </div>
  )
}
