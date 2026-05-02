'use client'

export interface LineSeries {
  label: string
  data: number[]
  color: string
}

interface LineChartProps {
  series: LineSeries[]
  labels: string[]
  height?: number
  currency?: boolean
}

export default function LineChart({ series, labels, height = 140, currency = true }: LineChartProps) {
  const w = 520
  const h = height
  const pad = { t: 16, r: 16, b: 28, l: 68 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  const all = series.flatMap((s) => s.data)
  if (all.length === 0) return null

  const minV = Math.min(...all)
  const maxV = Math.max(...all)
  const range = maxV - minV || 1

  const n = labels.length
  const px = (i: number) => pad.l + (i / (n - 1 || 1)) * cw
  const py = (v: number) => pad.t + ch - ((v - minV) / range) * ch

  const fmtTick = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const yy = pad.t + ch * (1 - t)
        const val = minV + t * range
        return (
          <g key={t}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={yy}
              y2={yy}
              stroke="#E4D7C2"
              strokeWidth=".8"
              strokeDasharray="3,3"
            />
            <text
              x={pad.l - 5}
              y={yy}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9"
              fill="#2F3B33"
              fillOpacity=".45"
              fontFamily="Inter,sans-serif"
            >
              {fmtTick(val)}
            </text>
          </g>
        )
      })}

      {series.map((s) => {
        const pts = s.data.map((v, i) => `${px(i)},${py(v)}`).join(' ')
        const area = [
          `${px(0)},${py(minV)}`,
          ...s.data.map((v, i) => `${px(i)},${py(v)}`),
          `${px(s.data.length - 1)},${py(minV)}`,
        ].join(' ')
        return (
          <g key={s.label}>
            <polygon points={area} fill={s.color} fillOpacity=".08" />
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.data.map((v, i) => (
              <circle
                key={i}
                cx={px(i)}
                cy={py(v)}
                r="3"
                fill={s.color}
                stroke="white"
                strokeWidth="1.5"
              />
            ))}
          </g>
        )
      })}

      {labels.map((l, i) => (
        <text
          key={i}
          x={px(i)}
          y={h - 5}
          textAnchor="middle"
          fontSize="9"
          fill="#2F3B33"
          fillOpacity=".45"
          fontFamily="Inter,sans-serif"
        >
          {l}
        </text>
      ))}
    </svg>
  )
}
