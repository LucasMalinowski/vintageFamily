'use client'

import { formatBRL } from '@/lib/money'

export interface HBarItem {
  label: string
  value: number
  pct: number
  color: string
}

interface HBarChartProps {
  items: HBarItem[]
  currency?: boolean
}

export default function HBarChart({ items, currency = true }: HBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-ink/70">
            <span>{item.label}</span>
            <span className="font-semibold tabular-nums">
              {currency ? formatBRL(item.value) : item.value.toLocaleString('pt-BR')} ({item.pct}%)
            </span>
          </div>
          <div className="h-[7px] bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
