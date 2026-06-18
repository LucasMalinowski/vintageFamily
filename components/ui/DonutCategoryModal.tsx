'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Calendar, MousePointer2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatBRL } from '@/lib/money'
import { formatDate } from '@/lib/dates'
import type { DonutSlice } from '@/components/ui/DonutChart'

interface DonutExpense {
  id: string
  description: string
  amount_cents: number
  date: string
  status: string
  payment_method: string | null
  category_name: string
  category_id: string | null
}

interface DonutCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  slices: DonutSlice[]
  total: number
  title?: string
  expenses?: DonutExpense[]
  getCategoryLabel?: (id: string | null, name: string) => string
  getCatRailColor?: (label: string) => string
}

const getGap = (count: number) => count > 1 ? 0.7 : 0

function DonutSvg({
  slices,
  center,
  selectedLabel,
  onSelect,
}: {
  slices: DonutSlice[]
  center: string
  selectedLabel: string | null
  onSelect: (label: string) => void
}) {
  const t = useTranslations()
  const r = 64
  const cx = 80
  const cy = 80
  const strokeBase = 24
  const circ = 2 * Math.PI * r
  const GAP_PX = getGap(slices.length)
  const totalValue = slices.reduce((sum, s) => sum + s.value, 0)
  let off = 0
  const arcs = slices.map((s) => {
    const fraction = totalValue > 0 ? s.value / totalValue : 0
    const fullDash = fraction * circ
    const dash = Math.max(fullDash - GAP_PX, 0)
    const arc = { ...s, off: off + GAP_PX / 2, dash, gap: circ - dash }
    // eslint-disable-next-line react-hooks/immutability
    off += fullDash
    return arc
  })

  const hasSelection = !!selectedLabel

  return (
    <svg viewBox="0 0 160 160" className="w-[200px] h-[200px] mx-auto" style={{ cursor: 'pointer' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4D7C2" strokeWidth={strokeBase} />

      {arcs.map((a, i) => {
        const isSelected = a.label === selectedLabel
        const dimmed = hasSelection && !isSelected
        const strokeW = isSelected ? strokeBase + 6 : strokeBase
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color}
            strokeWidth={strokeW}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.off + circ / 4}
            opacity={dimmed ? 0.25 : 1}
            style={{ transition: 'opacity 0.2s, stroke-width 0.2s', cursor: 'pointer' }}
            onClick={() => onSelect(a.label)}
          />
        )
      })}

      {selectedLabel ? (
        <>
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9" fill="#2F3B33" fillOpacity=".5" fontFamily="Inter,sans-serif">
            {selectedLabel.length > 14 ? selectedLabel.slice(0, 13) + '…' : selectedLabel}
          </text>
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="13" fill="#2F3B33" fontWeight="700" fontFamily="Inter,sans-serif">
            {slices.find(s => s.label === selectedLabel)?.pct ?? 0}%
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="10" fill="#2F3B33" fillOpacity=".5" fontFamily="Inter,sans-serif">{t('donutModal.total')}</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="14" fill="#2F3B33" fontWeight="700" fontFamily="Inter,sans-serif">{center}</text>
        </>
      )}
    </svg>
  )
}

export default function DonutCategoryModal({
  isOpen,
  onClose,
  slices,
  total,
  expenses = [],
  getCategoryLabel = (_id, name) => name,
  getCatRailColor = () => '#3E5F4B',
}: DonutCategoryModalProps) {
  const t = useTranslations()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const centerText = formatBRL(total).replace('R$ ', '')

  const selectedSlice = slices.find((s) => s.label === selectedCategory)
  const visibleLabels = new Set(slices.filter((s) => s.label !== 'Outros').map((s) => s.label))
  const filteredExpenses = !selectedCategory
    ? []
    : selectedCategory === 'Outros'
      ? expenses.filter((e) => !visibleLabels.has(getCategoryLabel(e.category_id, e.category_name)))
      : expenses.filter((e) => getCategoryLabel(e.category_id, e.category_name) === selectedCategory)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
          leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-[780px] min-w-[480px] bg-bg rounded-[20px] border border-border shadow-[0_24px_64px_rgba(47,59,51,0.16)] flex flex-col overflow-hidden"
              style={{ height: 'min(85vh, 640px)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
                <Dialog.Title className="font-serif text-[20px] text-coffee">{t('donutModal.title')}</Dialog.Title>
                <button type="button" onClick={onClose} aria-label={t('donutModal.close')} className="text-ink/40 hover:text-ink transition-vintage">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body — always horizontal split */}
              <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* Left: donut + category list */}
                <div className="flex flex-col w-[340px] shrink-0 min-h-0 border-r border-border">
                  <div className="px-6 pt-5 pb-3 shrink-0">
                    <DonutSvg
                      slices={slices}
                      center={centerText}
                      selectedLabel={selectedCategory}
                      onSelect={(label) => setSelectedCategory(sel => sel === label ? null : label)}
                    />
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-5">
                    <div className="rounded-xl border border-border overflow-hidden">
                      {slices.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setSelectedCategory(sel => sel === s.label ? null : s.label)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-vintage border-b border-border/60 last:border-0"
                          style={{
                            background: selectedCategory === s.label ? `${s.color}12` : '#fff',
                            borderLeft: selectedCategory === s.label ? `3px solid ${s.color}` : '3px solid transparent',
                          }}
                        >
                          <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: s.color }} />
                          <span className="flex-1 text-[13px] text-ink font-medium truncate">{s.label}</span>
                          <span className="text-[11.5px] text-ink/50 tabular-nums shrink-0">{formatBRL(s.value).replace('R$ ', '')}</span>
                          <span className="text-[12px] font-bold w-8 text-right tabular-nums shrink-0" style={{ color: s.color }}>{s.pct}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: always rendered */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0">
                  {selectedSlice ? (
                    <>
                      {/* Summary card */}
                      <div className="px-5 pt-5 pb-3 shrink-0">
                        <div
                          className="rounded-xl p-4 border"
                          style={{ background: `${selectedSlice.color}0D`, borderColor: `${selectedSlice.color}30` }}
                        >
                          <p className="text-[12.5px] text-ink/55 mb-1">{selectedSlice.label}</p>
                          <p className="font-numbers font-bold text-[26px] tabular-nums leading-tight" style={{ color: selectedSlice.color }}>
                            {formatBRL(selectedSlice.value)}
                          </p>
                          <p className="text-[12px] text-ink/50 mt-0.5">
                            {t('donutModal.percent', { value: selectedSlice.pct })} · {t('donutModal.items', { count: filteredExpenses.length })}
                          </p>
                        </div>
                      </div>

                      {/* Expense rows */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 space-y-2">
                        {filteredExpenses.map((e) => {
                          const isPaid = e.status === 'paid'
                          const railColor = getCatRailColor(getCategoryLabel(e.category_id, e.category_name))
                          return (
                            <div key={e.id} className="flex items-stretch overflow-hidden rounded-[10px] bg-white border border-border">
                              <div className="w-1 shrink-0" style={{ background: railColor }} />
                              <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[13.5px] font-serif truncate ${isPaid ? 'line-through text-ink/50' : 'text-coffee'}`}>
                                    {e.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="flex items-center gap-1 text-[11px] text-ink/45">
                                      <Calendar className="w-3 h-3" />{formatDate(e.date, 'dd/MM/yy')}
                                    </span>
                                    {e.payment_method && (
                                      <span className="text-[11px] text-ink/45">
                                        {e.payment_method === 'PIX' ? 'PIX' : e.payment_method === 'Credito' ? t('filterSheet.methodCredit') : e.payment_method === 'Debito' ? t('filterSheet.methodDebit') : e.payment_method}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-auto text-right shrink-0">
                                  <p className="font-numbers font-bold text-[14px] tabular-nums text-coffee">{formatBRL(e.amount_cents)}</p>
                                  <span
                                    className="text-[10.5px] font-bold uppercase tracking-wide"
                                    style={{ color: isPaid ? '#3E8E5C' : '#A58E5F' }}
                                  >
                                    {isPaid ? t('expenses.statusPaid') : t('expenses.statusOpen')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    /* Empty state — shown when no category is selected */
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                      <div className="w-11 h-11 rounded-full bg-parchment flex items-center justify-center">
                        <MousePointer2 className="w-5 h-5 text-ink/35" />
                      </div>
                      <p className="text-[14px] font-serif text-coffee">{t('donutModal.selectCategory')}</p>
                      <p className="text-[12px] text-ink/45 leading-relaxed max-w-[200px]">
                        {t('donutModal.selectCategoryHint')}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
