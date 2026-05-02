'use client'

import { formatBRL } from '@/lib/money'

export interface DonutSlice {
  label: string
  value: number
  pct: number
  color: string
}

interface DonutChartProps {
  slices: DonutSlice[]
  center: string
  currency?: boolean
}

export default function DonutChart({ slices, center, currency = true }: DonutChartProps) {
  const r = 52
  const cx = 70
  const cy = 70
  const stroke = 22
  const circ = 2 * Math.PI * r

  let off = 0
  const arcs = slices.map((s) => {
    const dash = (s.pct / 100) * circ
    const arc = { ...s, off, dash, gap: circ - dash }
    off += dash
    return arc
  })

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 140 140" className="w-full max-w-[200px] mx-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4D7C2" strokeWidth={stroke} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.off + circ / 4}
          />
        ))}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontSize="9"
          fill="#2F3B33"
          fillOpacity=".5"
          fontFamily="Inter,sans-serif"
        >
          Total
        </text>
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fontSize="9.5"
          fill="#2F3B33"
          fontWeight="600"
          fontFamily="Inter,sans-serif"
        >
          {center}
        </text>
      </svg>

      <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div
              className="w-[9px] h-[9px] rounded-[2px] shrink-0"
              style={{ background: s.color }}
            />
            <span className="flex-1 text-[11px] font-medium text-ink truncate min-w-0">{s.label}</span>
            <span className="text-[10px] text-ink/50 shrink-0 tabular-nums ml-2">
              {currency ? formatBRL(s.value) : s.value.toLocaleString('pt-BR')} ({s.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
