'use client'

import type { LucideIcon } from 'lucide-react'

type IconTheme = 'red' | 'green' | 'orange' | 'blue' | 'purple' | 'teal'

const ICON_THEMES: Record<IconTheme, { box: string; icon: string }> = {
  red:    { box: '#FDECEA', icon: '#E05252' },
  green:  { box: '#E8F5EE', icon: '#3E9E6A' },
  orange: { box: '#FEF3E2', icon: '#D97E20' },
  blue:   { box: '#E3EEF8', icon: '#2F6F7E' },
  purple: { box: '#EEE9F8', icon: '#7A66A1' },
  teal:   { box: '#E3F4F6', icon: '#2A8FA0' },
}

interface AnalyticsKpiCardProps {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  subNegative?: boolean
  iconTheme?: IconTheme
  icon?: LucideIcon
  small?: boolean
}

export default function AnalyticsKpiCard({
  label,
  value,
  sub,
  subPositive,
  subNegative,
  iconTheme = 'blue',
  icon: Icon,
  small,
}: AnalyticsKpiCardProps) {
  const theme = ICON_THEMES[iconTheme]
  const subColor = subPositive ? '#3E9E6A' : subNegative ? '#C06060' : 'rgba(47,59,51,0.55)'

  return (
    <div
      className={`bg-white rounded-xl border border-border shadow-soft flex flex-col ${
        small ? 'gap-0.5 p-3' : 'gap-0.5 p-4'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className={`rounded-[9px] flex items-center justify-center shrink-0 ${
            small ? 'w-8 h-8' : 'w-9 h-9'
          }`}
          style={{ background: theme.box }}
        >
          {Icon && <Icon size={small ? 14 : 16} style={{ color: theme.icon }} />}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50 leading-tight">
          {label}
        </span>
      </div>
      <div
        className={`font-numbers font-bold text-ink tabular-nums leading-tight ${
          small ? 'text-[17px]' : 'text-[21px]'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  )
}
