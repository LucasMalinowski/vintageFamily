'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { usePlan } from '@/lib/billing/plan-context'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function InsightsSettingsPage() {
  const { user } = useAuth()
  const { tier } = usePlan()
  const t = useTranslations()
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
          const stored = data.insight_interval_days ?? 30
          // Snap legacy free-form values (e.g. 3) to the nearest supported option
          const validOptions = [7, 14, 30]
          setIntervalDays(validOptions.includes(stored) ? stored : 30)
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
        insight_interval_days: hasFullInsightAccess ? intervalDays : 30,
        insight_channels: channels,
      })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="py-12 text-center text-ink/50 text-sm">{t('settings.insights.loading')}</div>

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-serif text-ink">{t('settings.insights.title')}</h2>
        <p className="text-sm text-ink/60 mt-1">
          {t('settings.insights.subtitle')}
        </p>
      </div>

      {/* Enable/disable */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">{t('settings.insights.proactive.title')}</p>
            <p className="text-xs text-ink/50 mt-0.5">{t('settings.insights.proactive.desc')}</p>
          </div>
          <button
            type="button"
            onClick={() => setInsightsEnabled((v) => !v)}
            aria-label={insightsEnabled ? t('settings.insights.proactive.disableLabel') : t('settings.insights.proactive.enableLabel')}
            aria-pressed={insightsEnabled}
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
            {t('settings.insights.proactive.disabledNote')}
          </p>
        )}
      </div>

      {/* Interval */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-ink">{t('settings.insights.frequency.title')}</p>
              {!hasFullInsightAccess && <Lock className="w-3.5 h-3.5 text-gold" />}
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              {hasFullInsightAccess ? t('settings.insights.frequency.availableDesc') : t('settings.insights.frequency.lockedDesc')}
            </p>
          </div>
          <select
            value={intervalDays}
            aria-label={t('settings.insights.frequency.title')}
            onChange={(e) => {
              if (!hasFullInsightAccess) { setUpsellOpen(true); return }
              setIntervalDays(Number(e.target.value))
            }}
            onFocus={() => { if (!hasFullInsightAccess) setUpsellOpen(true) }}
            className={`px-3 py-2 border rounded-lg text-sm text-center transition-vintage focus:outline-none ${
              hasFullInsightAccess
                ? 'border-border bg-paper text-ink focus:ring-2 focus:ring-paper-2/50'
                : 'border-border bg-paper/60 text-ink/40 cursor-not-allowed'
            }`}
            disabled={!hasFullInsightAccess}
          >
            <option value={7}>{t('settings.insights.frequency.weekly')}</option>
            <option value={14}>{t('settings.insights.frequency.biweekly')}</option>
            <option value={30}>{t('settings.insights.frequency.monthly')}</option>
          </select>
        </div>
        <p className="text-xs text-ink/30">
          {hasFullInsightAccess
            ? intervalDays === 7
              ? t('settings.insights.frequency.noteWeekly')
              : intervalDays === 14
                ? t('settings.insights.frequency.noteBiweekly')
                : t('settings.insights.frequency.noteMonthly')
            : t('settings.insights.frequency.noteFreeTier')}
        </p>
      </div>

      {/* Channels */}
      <div className="bg-bg border border-border rounded-vintage p-5 space-y-3">
        <p className="text-sm font-medium text-ink">{t('settings.insights.channels.title')}</p>
        <div className="space-y-2">
          {[
            { value: 'whatsapp', label: t('settings.insights.channels.whatsappLabel'), desc: t('settings.insights.channels.whatsappDesc') },
            { value: 'email', label: t('settings.insights.channels.emailLabel'), desc: t('settings.insights.channels.emailDesc') },
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
        {saved ? t('settings.insights.saved') : saving ? t('settings.insights.saving') : t('settings.insights.save')}
      </button>

      {/* Upsell modal */}
      <Modal isOpen={upsellOpen} onClose={() => setUpsellOpen(false)} title={t('settings.insights.upsell.title')}>
        <div className="space-y-4">
          <p className="text-sm text-ink/70">
            {t('settings.insights.upsell.body')}
          </p>
          <p className="text-sm text-ink/70">
            {t('settings.insights.upsell.freeNote')}
          </p>
          <Link
            href="/settings/billing"
            className="block w-full text-center py-3 bg-coffee text-paper rounded-lg text-sm font-semibold hover:bg-coffee/90 transition-vintage"
          >
            {t('settings.insights.upsell.cta')}
          </Link>
          <button
            type="button"
            onClick={() => setUpsellOpen(false)}
            className="block w-full text-center py-2 text-sm text-ink/50 hover:text-ink transition-vintage"
          >
            {t('settings.insights.upsell.freeCta')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
