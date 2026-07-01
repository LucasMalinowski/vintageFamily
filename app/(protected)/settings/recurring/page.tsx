'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { formatMoney } from '@/lib/money'
import type { AppLocale } from '@/lib/i18n/getLocale'
import { useTranslations, useLocale } from 'next-intl'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface RecurringPattern {
  id: string
  description_pattern: string
  kind: 'expense' | 'income'
  frequency: string
  estimated_amount_cents: number | null
  source: 'auto' | 'user'
  is_active: boolean
  next_expected_date: string | null
  updated_at: string
}

const FREQUENCY_KEYS: Record<string, string> = {
  weekly: 'expenses.frequencyWeekly',
  biweekly: 'expenses.frequencyBiweekly',
  monthly: 'expenses.frequencyMonthly',
  bimonthly: 'expenses.frequencyBimonthly',
  quarterly: 'expenses.frequencyQuarterly',
  semiannual: 'expenses.frequencySemiannual',
  annual: 'expenses.frequencyAnnual',
}

export default function RecurringSettingsPage() {
  const { familyId, currency } = useAuth()
  const t = useTranslations()
  const locale = useLocale() as AppLocale

  const [patterns, setPatterns] = useState<RecurringPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (!familyId) return
    const loadPatterns = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('recurring_patterns')
        .select('id,description_pattern,kind,frequency,estimated_amount_cents,source,is_active,next_expected_date,updated_at')
        .eq('family_id', familyId)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false })
      setPatterns((data ?? []) as RecurringPattern[])
      setLoading(false)
    }
    loadPatterns()
  }, [familyId])

  const toggleActive = async (pattern: RecurringPattern) => {
    if (updatingIds.includes(pattern.id)) return
    const nextActive = !pattern.is_active
    setUpdatingIds((prev) => [...prev, pattern.id])
    setPatterns((prev) => prev.map((p) => p.id === pattern.id ? { ...p, is_active: nextActive } : p))
    await supabase
      .from('recurring_patterns')
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq('id', pattern.id)
    setUpdatingIds((prev) => prev.filter((id) => id !== pattern.id))
  }

  const filteredPatterns = patterns.filter((p) => {
    if (filter === 'active') return p.is_active
    if (filter === 'inactive') return !p.is_active
    return true
  })

  if (loading) return <div className="py-12 text-center text-ink/50 text-sm">{t('common.loading')}</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-serif text-ink">{t('settings.recurring.title')}</h2>
        <p className="text-sm text-ink/60 mt-1">{t('settings.recurring.subtitle')}</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-vintage ${
              filter === value
                ? 'bg-coffee text-paper border-coffee'
                : 'bg-bg text-ink/60 border-border hover:bg-paper'
            }`}
          >
            {t(`settings.recurring.filter.${value}`)}
          </button>
        ))}
      </div>

      {filteredPatterns.length === 0 ? (
        <p className="text-sm text-ink/50 py-8 text-center">{t('settings.recurring.empty')}</p>
      ) : (
        <div className="space-y-2.5">
          {filteredPatterns.map((pattern) => {
            const isUpdating = updatingIds.includes(pattern.id)
            const Icon = pattern.kind === 'income' ? TrendingUp : TrendingDown
            return (
              <div
                key={pattern.id}
                className={`flex items-center gap-3 p-4 rounded-vintage border transition-vintage ${
                  pattern.is_active ? 'bg-bg border-border' : 'bg-paper border-border opacity-70'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{
                    background: pattern.kind === 'income' ? 'rgba(62,142,92,0.12)' : 'rgba(176,92,58,0.12)',
                    color: pattern.kind === 'income' ? '#3E8E5C' : '#B05C3A',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{pattern.description_pattern}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {t(FREQUENCY_KEYS[pattern.frequency] ?? 'expenses.frequencyMonthly')}
                    {pattern.estimated_amount_cents ? ` · ${formatMoney(pattern.estimated_amount_cents, currency, locale)}` : ''}
                    {pattern.source === 'auto' ? ` · ${t('settings.recurring.autoDetected')}` : ` · ${t('settings.recurring.userCreated')}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    pattern.is_active ? 'bg-olive/15 text-olive' : 'bg-ink/10 text-ink/50'
                  }`}>
                    {pattern.is_active ? t('settings.recurring.statusActive') : t('settings.recurring.statusDismissed')}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleActive(pattern)}
                    disabled={isUpdating}
                    aria-label={pattern.is_active ? t('settings.recurring.disableAria') : t('settings.recurring.enableAria')}
                    aria-pressed={pattern.is_active}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      pattern.is_active ? 'bg-coffee' : 'bg-border'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        pattern.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
