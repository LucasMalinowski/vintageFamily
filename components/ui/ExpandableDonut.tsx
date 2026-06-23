'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Maximize2 } from 'lucide-react'
import { formatMoney } from '@/lib/money'
import DonutChart from '@/components/ui/DonutChart'
import DonutCategoryModal from '@/components/ui/DonutCategoryModal'
import type { DonutSlice } from '@/components/ui/DonutChart'

interface DonutItem {
  id: string
  description: string
  amount_cents: number
  date: string
  status: string
  payment_method: string | null
  category_name: string
  category_id: string | null
}

interface ExpandableDonutProps {
  slices: DonutSlice[]
  total: number
  title?: string
  modalTitle?: string
  accentColor?: string
  items?: DonutItem[]
  getCategoryLabel?: (id: string | null, name: string) => string
  getCatRailColor?: (label: string) => string
  /** Extra content rendered below the mini legend */
  footer?: React.ReactNode
  currency?: string
}

export default function ExpandableDonut({
  slices,
  total,
  title,
  modalTitle,
  accentColor,
  items = [],
  getCategoryLabel,
  getCatRailColor,
  footer,
  currency = 'BRL',
}: ExpandableDonutProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [modalOpen, setModalOpen] = useState(false)

  const resolvedTitle = title ?? t('comparatives.byCategory')
  const centerText = formatMoney(total, currency, locale).replace(/^\D+/, '').trim()

  return (
    <>
      <div
        className="bg-white rounded-xl border border-border shadow-soft p-5 cursor-pointer hover:shadow-vintage transition-vintage"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-[16px] text-coffee">{resolvedTitle}</h3>
          <Maximize2 className="w-3.5 h-3.5 text-ink/35" />
        </div>

        <DonutChart slices={slices} center={centerText} showLegend={false} />

        {/* Mini legend — top 4 */}
        <div className="mt-3 space-y-1.5">
          {slices.slice(0, 4).map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-[9px] h-[9px] rounded-[2px] shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-[12px] text-ink truncate">{s.label}</span>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.pct}%</span>
            </div>
          ))}
          {slices.length > 4 && (
            <p className="text-[11px] text-ink/40 pt-0.5">{t('expenses.moreCategories', { count: slices.length - 4 })}</p>
          )}
        </div>

        {footer}
      </div>

      <DonutCategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        slices={slices}
        total={total}
        title={modalTitle ?? resolvedTitle}
        expenses={items}
        getCategoryLabel={getCategoryLabel}
        getCatRailColor={getCatRailColor}
        currency={currency}
      />
    </>
  )
}
