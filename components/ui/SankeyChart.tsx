'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/money'

export interface SankeyNode {
  id: string
  col: 0 | 1 | 2
  label: string
  value: number
  color: string
  pct?: string
}

export interface SankeyLink {
  from: string
  to: string
  value: number
  color: string
}

interface SankeyChartProps {
  nodes: SankeyNode[]
  links: SankeyLink[]
  width?: number
  height?: number
  currency?: boolean
}

export default function SankeyChart({
  nodes,
  links,
  width = 600,
  height = 280,
  currency = true,
}: SankeyChartProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const fmt = (v: number) => (currency ? formatBRL(v) : v.toLocaleString('pt-BR'))

  const visibleNodes = focusedNodeId
    ? nodes.filter((n) => {
        if (n.col === 0) return true
        if (n.col === 1) return n.id === focusedNodeId
        return links.some((l) => l.from === focusedNodeId && l.to === n.id)
      })
    : nodes

  const visibleIds = new Set(visibleNodes.map((n) => n.id))
  const visibleLinks = links.filter((l) => visibleIds.has(l.from) && visibleIds.has(l.to))

  const maxCol = visibleNodes.length > 0 ? Math.max(...visibleNodes.map((n) => n.col)) : 2
  const colX = maxCol <= 1 ? [0.05, 0.58, 0.95] : [0.04, 0.38, 0.72]

  const cols = [0, 1, 2].map((c) => visibleNodes.filter((n) => n.col === c))
  const nodeW = width < 380 ? 76 : 108
  const fs = width < 380 ? 8 : 10
  const maxLabelChars = Math.floor(nodeW / (fs * 0.62))
  const trunc = (s: string) => s.length > maxLabelChars ? s.slice(0, maxLabelChars - 1) + '…' : s
  const placed: Record<string, { x: number; y: number; h: number; w: number }> = {}

  const usableH = height - 20
  const minH = 50
  // Normalize node heights globally so small-value nodes in sparse columns stay small
  const maxNodeVal = visibleNodes.length > 0 ? Math.max(...visibleNodes.map((n) => n.value)) : 1

  cols.forEach((col, ci) => {
    if (col.length === 0) return
    const gap = col.length > 1 ? 14 : 0
    const totalGap = gap * (col.length - 1)
    const maxAvail = usableH - totalGap

    // Raw heights proportional to the global max node value
    const rawH = col.map((n) => Math.max(minH, (n.value / maxNodeVal) * usableH))
    const rawTotal = rawH.reduce((s, h) => s + h, 0)

    // If they exceed available space, scale the over-minimum portion down to fit
    const heights: number[] = rawTotal <= maxAvail
      ? rawH
      : (() => {
          const overMin = rawH.map((h) => h - minH)
          const overTotal = overMin.reduce((s, h) => s + h, 0)
          const budget = Math.max(0, maxAvail - minH * col.length)
          const scale = overTotal > 0 ? budget / overTotal : 0
          return rawH.map((h, i) => minH + overMin[i] * scale)
        })()

    // Vertically center the column within the SVG
    const colH = heights.reduce((s, h) => s + h, 0) + totalGap
    let y = 10 + Math.max(0, (usableH - colH) / 2)

    col.forEach((n, ni) => {
      placed[n.id] = { x: colX[ci] * width, y, h: heights[ni], w: nodeW }
      y += heights[ni] + gap
    })
  })

  // Cap band height at half the node height so flows don't fill the entire pill.
  // minBand keeps tiny flows visible.
  const minBand = 10
  const capBand = (val: number, total: number, nodeH: number) =>
    Math.max(minBand, Math.min(nodeH * 0.5, (val / (total || 1)) * nodeH))

  // Pre-compute totals per node for band-height calculation
  const srcTotals = new Map<string, number>()
  const dstTotals = new Map<string, number>()
  visibleLinks.forEach((lk) => {
    if (!srcTotals.has(lk.from))
      srcTotals.set(lk.from, visibleLinks.filter((l) => l.from === lk.from).reduce((s, l) => s + l.value, 0))
    if (!dstTotals.has(lk.to))
      dstTotals.set(lk.to, visibleLinks.filter((l) => l.to === lk.to).reduce((s, l) => s + l.value, 0))
  })

  // Capped band height for every link
  const bandH = visibleLinks.map((lk) => {
    const src = placed[lk.from]
    const dst = placed[lk.to]
    if (!src || !dst) return { s: minBand, d: minBand }
    return {
      s: capBand(lk.value, srcTotals.get(lk.from) ?? 1, src.h),
      d: capBand(lk.value, dstTotals.get(lk.to) ?? 1, dst.h),
    }
  })

  // Total band height consumed per node (for centering the stack within the pill)
  const nodeSrcUsed = new Map<string, number>()
  const nodeDstUsed = new Map<string, number>()
  visibleLinks.forEach((lk, i) => {
    nodeSrcUsed.set(lk.from, (nodeSrcUsed.get(lk.from) ?? 0) + bandH[i].s)
    nodeDstUsed.set(lk.to, (nodeDstUsed.get(lk.to) ?? 0) + bandH[i].d)
  })

  const paths = visibleLinks.map((lk, i) => {
    const src = placed[lk.from]
    const dst = placed[lk.to]
    if (!src || !dst) return null

    const srcH = bandH[i].s
    const dstH = bandH[i].d

    // Center the band stack within the pill
    const srcCenter = Math.max(0, (src.h - (nodeSrcUsed.get(lk.from) ?? 0)) / 2)
    const dstCenter = Math.max(0, (dst.h - (nodeDstUsed.get(lk.to) ?? 0)) / 2)

    // Cumulative stack offset for links at the same node before this one
    const srcStack = visibleLinks
      .filter((l, j) => l.from === lk.from && j < i)
      .reduce((s, l) => s + bandH[visibleLinks.indexOf(l)].s, 0)
    const dstStack = visibleLinks
      .filter((l, j) => l.to === lk.to && j < i)
      .reduce((s, l) => s + bandH[visibleLinks.indexOf(l)].d, 0)

    const x1 = src.x + src.w
    const y1 = src.y + srcCenter + srcStack
    const x2 = dst.x
    const y2 = dst.y + dstCenter + dstStack
    const mx = (x1 + x2) / 2

    return {
      id: `lk${i}`,
      color: lk.color,
      d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2} L${x2},${y2 + dstH} C${mx},${y2 + dstH} ${mx},${y1 + srcH} ${x1},${y1 + srcH} Z`,
    }
  })

  const handleNodeClick = (node: SankeyNode) => {
    if (node.col !== 1) return
    setFocusedNodeId((prev) => (prev === node.id ? null : node.id))
  }

  return (
    <div className="relative overflow-hidden">
      {focusedNodeId && (
        <button
          type="button"
          onClick={() => setFocusedNodeId(null)}
          className="mb-2 inline-flex items-center gap-1 text-xs text-petrol font-medium hover:opacity-75 transition-opacity"
        >
          ← Voltar à visão geral
        </button>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', maxWidth: '100%' }}
      >
        {paths.map(
          (p) =>
            p && (
              <path
                key={p.id}
                d={p.d}
                fill={p.color}
                fillOpacity={hoveredPath === p.id ? 0.55 : 0.32}
                stroke={p.color}
                strokeOpacity={hoveredPath === p.id ? 0.7 : 0.4}
                strokeWidth="0.5"
                onMouseEnter={() => setHoveredPath(p.id)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{ transition: 'fill-opacity .15s' }}
              />
            ),
        )}

        {visibleNodes.map((n) => {
          const p = placed[n.id]
          if (!p) return null
          const isClickable = n.col === 1
          const isFocused = focusedNodeId === n.id
          const dimmed = focusedNodeId && n.col === 1 && !isFocused

          return (
            <g
              key={n.id}
              onClick={() => handleNodeClick(n)}
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx="8"
                fill={n.color}
                opacity={dimmed ? 0.25 : 1}
                style={{ transition: 'opacity .2s' }}
              />
              {isFocused && (
                <rect
                  x={p.x - 2}
                  y={p.y - 2}
                  width={p.w + 4}
                  height={p.h + 4}
                  rx="10"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeOpacity="0.55"
                />
              )}
              {n.label.length > maxLabelChars && <title>{n.label}</title>}
              <text
                x={p.x + p.w / 2}
                y={p.y + p.h / 2 - (n.pct ? 10 : 5)}
                textAnchor="middle"
                fill="white"
                fontSize={fs}
                fontWeight="600"
                fontFamily="Inter,sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {trunc(n.label)}
              </text>
              <text
                x={p.x + p.w / 2}
                y={p.y + p.h / 2 + (n.pct ? 4 : 8)}
                textAnchor="middle"
                fill="white"
                fontSize={fs - 1}
                fontFamily="Inter,sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {fmt(n.value)}
              </text>
              {n.pct && (
                <text
                  x={p.x + p.w / 2}
                  y={p.y + p.h / 2 + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,.7)"
                  fontSize={fs - 2}
                  fontFamily="Inter,sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {n.pct}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
