'use client'

import { useMemo, useRef, useEffect, useState, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  SankeyGraph,
  SankeyNode as D3SankeyNode,
  SankeyLink as D3SankeyLink,
} from 'd3-sankey'
import { formatBRL } from '@/lib/money'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, X, ChevronLeft } from 'lucide-react'

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
  height?: number  // ignored — auto-computed
  currency?: boolean
}

type LayoutNode = D3SankeyNode<{ id: string; label: string; color: string; pct?: string }, { color: string }>
type LayoutLink = D3SankeyLink<{ id: string; label: string; color: string; pct?: string }, { color: string }>

const NODE_WIDTH = 110
const NODE_PADDING = 20
const H_PADDING = 8
const MIN_HEIGHT = 260
const PREVIEW_HEIGHT = 200
const MODAL_SVG_WIDTH = 1140

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(560)
  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    obs.observe(ref.current)
    setWidth(ref.current.clientWidth)
    return () => obs.disconnect()
  }, [])
  return width
}

function computeLayout(nodes: SankeyNode[], links: SankeyLink[], svgW: number, svgH: number) {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const graph: SankeyGraph<
    { id: string; label: string; color: string; pct?: string },
    { color: string }
  > = {
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, color: n.color, pct: n.pct })),
    links: links
      .filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to) && l.from !== l.to)
      .map((l) => ({
        source: l.from as unknown as number,
        target: l.to as unknown as number,
        value: Math.max(l.value, 1),
        color: l.color,
      })),
  }
  return d3Sankey<
    { id: string; label: string; color: string; pct?: string },
    { color: string }
  >()
    .nodeId((d) => d.id)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(NODE_PADDING)
    .iterations(32)
    .extent([[H_PADDING, H_PADDING], [svgW - H_PADDING, svgH - H_PADDING]])(graph)
}

// Count nodes per actual d3-sankey column (by x0 position) to handle sink nodes
// that get placed in the rightmost column regardless of their col metadata.
function maxNodesPerColumn(layoutNodes: LayoutNode[]): number {
  if (layoutNodes.length === 0) return 1
  const countMap = new Map<number, number>()
  for (const n of layoutNodes) {
    const x = Math.round(n.x0 ?? 0)
    countMap.set(x, (countMap.get(x) ?? 0) + 1)
  }
  return Math.max(...countMap.values())
}

const pathGen = sankeyLinkHorizontal()

// ─── Shared SVG renderer ──────────────────────────────────────────────────────

interface SvgContentProps {
  layoutNodes: LayoutNode[]
  layoutLinks: LayoutLink[]
  fmt: (v: number) => string
  idPrefix: string
  interactive: boolean
  focusedNodeId?: string | null
  onNodeClick?: (id: string | null) => void
}

function SvgContent({
  layoutNodes, layoutLinks, fmt, idPrefix, interactive, focusedNodeId, onNodeClick,
}: SvgContentProps) {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null)
  const hasFocus = !!focusedNodeId

  // All nodes reachable from the focused node via a single link hop
  const connectedNodeIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>()
    const ids = new Set<string>([focusedNodeId])
    for (const lk of layoutLinks) {
      const s = (lk.source as LayoutNode).id
      const t = (lk.target as LayoutNode).id
      if (s === focusedNodeId) ids.add(t)
      if (t === focusedNodeId) ids.add(s)
    }
    return ids
  }, [focusedNodeId, layoutLinks])

  // Sanitize node id for use in XML id attributes
  const clipId = (id: string) => `${idPrefix}c-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`

  return (
    <>
      <defs>
        {/* Link gradients */}
        {layoutLinks.map((lk, i) => {
          const src = lk.source as LayoutNode
          const dst = lk.target as LayoutNode
          return (
            <linearGradient
              key={i}
              id={`${idPrefix}g${i}`}
              gradientUnits="userSpaceOnUse"
              x1={src.x1}
              x2={dst.x0}
            >
              <stop offset="0%" stopColor={(lk as { color: string }).color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={(lk as { color: string }).color} stopOpacity="0.3" />
            </linearGradient>
          )
        })}
        {/* Per-node clip paths — 1px inset so text is always contained inside the pill */}
        {layoutNodes.map((n) => {
          const x0 = n.x0 ?? 0, x1 = n.x1 ?? 0, y0 = n.y0 ?? 0, y1 = n.y1 ?? 0
          return (
            <clipPath key={n.id} id={clipId(n.id)}>
              <rect x={x0 + 1} y={y0 + 1} width={Math.max(0, x1 - x0 - 2)} height={Math.max(0, y1 - y0 - 2)} rx="6" />
            </clipPath>
          )
        })}
      </defs>

      {/* Links */}
      {layoutLinks.map((lk, i) => {
        const srcId = (lk.source as LayoutNode).id
        const dstId = (lk.target as LayoutNode).id
        // highlight links that touch the focused node
        const highlighted = !hasFocus || srcId === focusedNodeId || dstId === focusedNodeId
        const d = pathGen(lk as Parameters<typeof pathGen>[0])
        const w = Math.max(1, lk.width ?? 1)
        return (
          <path
            key={i}
            d={d ?? ''}
            fill="none"
            stroke={`url(#${idPrefix}g${i})`}
            strokeWidth={w}
            strokeOpacity={hasFocus ? (highlighted ? 0.75 : 0.06) : hoveredLink === i ? 0.8 : 0.45}
            onMouseEnter={interactive && !hasFocus ? () => setHoveredLink(i) : undefined}
            onMouseLeave={interactive && !hasFocus ? () => setHoveredLink(null) : undefined}
            style={{ transition: 'stroke-opacity .2s', cursor: 'default' }}
          />
        )
      })}

      {/* Nodes */}
      {layoutNodes.map((n) => {
        const x0 = n.x0 ?? 0, x1 = n.x1 ?? 0, y0 = n.y0 ?? 0, y1 = n.y1 ?? 0
        const w = x1 - x0, h = y1 - y0
        const cx = x0 + w / 2
        const cy = y0 + h / 2
        const label = n.label ?? ''
        // Dynamic font size — shrink for very short nodes so text fits
        const fs = h < 22 ? 8 : w < 90 ? 9 : 10
        const maxChars = Math.floor(w / 6.5)
        const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label

        const isFocused   = focusedNodeId === n.id
        const isConnected = connectedNodeIds.has(n.id)
        const dimmed      = hasFocus && !isConnected
        const clickable   = interactive && !!onNodeClick

        // Lines to show — thresholds based on actual font size so small nodes still get labels
        // Using dominantBaseline="middle": text glyph is centered on the given y
        // Gap between two lines: fs * 0.65 above/below center
        const gap = fs * 0.65
        const show3 = h >= fs * 2.4 + 8 && !!n.pct
        const show2 = h >= fs * 1.4 + 2   // label + value with tight gap
        const show1 = h >= fs + 2          // at least the value line

        const labelY = show3 ? cy - fs * 1.3 : show2 ? cy - gap : cy
        const valueY = show3 ? cy           : show2 ? cy + gap  : cy
        const pctY   = cy + fs * 1.3

        return (
          <g
            key={n.id}
            style={{ cursor: clickable ? 'pointer' : 'default', transition: 'opacity .2s' }}
            opacity={dimmed ? 0.18 : 1}
            onClick={clickable ? () => onNodeClick!(isFocused ? null : n.id) : undefined}
          >
            <rect
              x={x0} y={y0} width={w} height={h} rx="7"
              fill={n.color}
              stroke={isFocused ? 'rgba(255,255,255,0.85)' : 'none'}
              strokeWidth={isFocused ? 2.5 : 0}
            />
            {displayLabel !== label && <title>{label}</title>}
            {show1 && (
              <g clipPath={`url(#${clipId(n.id)})`} style={{ pointerEvents: 'none' }}>
                {show2 && (
                  <text
                    x={cx} y={labelY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={fs} fontWeight="600" fontFamily="Inter,sans-serif"
                  >
                    {displayLabel}
                  </text>
                )}
                <text
                  x={cx} y={valueY}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,.92)" fontSize={Math.max(7, fs - 1)} fontFamily="Inter,sans-serif"
                >
                  {fmt(n.value ?? 0)}
                </text>
                {show3 && (
                  <text
                    x={cx} y={pctY}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,.62)" fontSize={Math.max(6, fs - 2)} fontFamily="Inter,sans-serif"
                  >
                    {n.pct}
                  </text>
                )}
              </g>
            )}
          </g>
        )
      })}
    </>
  )
}

// ─── Full-screen modal ────────────────────────────────────────────────────────

function SankeyModal({
  nodes, links, fmt, onClose,
}: {
  nodes: SankeyNode[]
  links: SankeyLink[]
  fmt: (v: number) => string
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Refs for synchronous access in event handlers — avoids stale closure issues
  const panRef  = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 })

  const [transform, setTransform] = useState({ x: 0, y: 0, zoom: 1 })
  const [dragging, setDragging] = useState(false)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const clampZ = (z: number) => Math.min(3, Math.max(0.25, z))

  const applyTransform = useCallback((x: number, y: number, zoom: number) => {
    panRef.current  = { x, y }
    zoomRef.current = zoom
    setTransform({ x, y, zoom })
  }, [])

  const { layoutNodes, layoutLinks, modalSvgHeight } = useMemo(() => {
    if (nodes.length === 0) return { layoutNodes: [], layoutLinks: [], modalSvgHeight: 500 }
    // Probe with generous height to determine actual column occupancy
    const probe = computeLayout(nodes, links, MODAL_SVG_WIDTH, 4000)
    const actualMax = maxNodesPerColumn(probe.nodes as LayoutNode[])
    const svgH = Math.max(500, actualMax * 130 + Math.max(0, actualMax - 1) * NODE_PADDING + 32)
    const computed = computeLayout(nodes, links, MODAL_SVG_WIDTH, svgH)
    return {
      layoutNodes: computed.nodes as LayoutNode[],
      layoutLinks: computed.links as LayoutLink[],
      modalSvgHeight: svgH,
    }
  }, [nodes, links])

  const focusedNode = focusedNodeId ? layoutNodes.find(n => n.id === focusedNodeId) : null

  // Center SVG in canvas on first render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    applyTransform(
      Math.max(24, (rect.width  - MODAL_SVG_WIDTH)   / 2),
      Math.max(24, (rect.height - modalSvgHeight) / 2),
      1,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ctrl+scroll zoom centered on the cursor position
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const oldZ = zoomRef.current
      const newZ = clampZ(oldZ - e.deltaY * 0.002)
      const ratio = newZ / oldZ
      applyTransform(
        cx - ratio * (cx - panRef.current.x),
        cy - ratio * (cy - panRef.current.y),
        newZ,
      )
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyTransform])

  // Escape → close or clear focus first
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (focusedNodeId) setFocusedNodeId(null)
      else onClose()
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose, focusedNodeId])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startPanX: panRef.current.x, startPanY: panRef.current.y }
    setDragging(true)
    e.preventDefault()
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.active) return
    applyTransform(
      dragRef.current.startPanX + (e.clientX - dragRef.current.startX),
      dragRef.current.startPanY + (e.clientY - dragRef.current.startY),
      zoomRef.current,
    )
  }
  const stopDrag = () => { dragRef.current.active = false; setDragging(false) }

  const zoomIn  = () => applyTransform(panRef.current.x, panRef.current.y, clampZ(zoomRef.current + 0.2))
  const zoomOut = () => applyTransform(panRef.current.x, panRef.current.y, clampZ(zoomRef.current - 0.2))
  const resetView = () => {
    const canvas = canvasRef.current
    if (!canvas) return applyTransform(0, 0, 1)
    const rect = canvas.getBoundingClientRect()
    applyTransform(
      Math.max(24, (rect.width  - MODAL_SVG_WIDTH)   / 2),
      Math.max(24, (rect.height - modalSvgHeight) / 2),
      1,
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col bg-paper rounded-xl shadow-2xl"
        style={{ width: 'min(96vw, 1480px)', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0 gap-3">
          {/* Left: breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0">
            {focusedNode ? (
              <>
                <button
                  type="button"
                  onClick={() => setFocusedNodeId(null)}
                  className="flex items-center gap-1 text-xs text-ink/50 hover:text-ink transition-vintage shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Ver tudo
                </button>
                <span className="text-ink/30 text-xs">›</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white truncate"
                  style={{ background: (focusedNode as { color?: string }).color ?? '#888' }}
                >
                  {(focusedNode as { label?: string }).label}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-ink/55 font-serif truncate">Fluxo financeiro</span>
            )}
          </div>

          {/* Right: zoom controls + close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={zoomOut}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-paper-2 text-ink/50 hover:text-ink transition-vintage"
              title="Reduzir (−)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-ink/40 w-9 text-center tabular-nums select-none">
              {Math.round(transform.zoom * 100)}%
            </span>
            <button type="button" onClick={zoomIn}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-paper-2 text-ink/50 hover:text-ink transition-vintage"
              title="Ampliar (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={resetView}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-paper-2 text-ink/40 hover:text-ink transition-vintage ml-0.5"
              title="Centralizar"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <div className="w-px h-4 bg-border mx-2" />
            <button type="button" onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-paper-2 text-ink/50 hover:text-ink transition-vintage"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hint when no focus */}
        {!focusedNode && (
          <p className="text-center text-[10px] text-ink/30 py-1 border-b border-border/50 shrink-0 select-none">
            Clique em um bloco para focar · Arraste para mover · Scroll para zoom
          </p>
        )}

        {/* Draggable canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative select-none"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            <svg
              width={MODAL_SVG_WIDTH}
              height={modalSvgHeight}
              viewBox={`0 0 ${MODAL_SVG_WIDTH} ${modalSvgHeight}`}
              style={{ display: 'block', userSelect: 'none' }}
            >
              <SvgContent
                layoutNodes={layoutNodes}
                layoutLinks={layoutLinks}
                fmt={fmt}
                idPrefix="mod-"
                interactive
                focusedNodeId={focusedNodeId}
                onNodeClick={setFocusedNodeId}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export default function SankeyChart({ nodes, links, currency = true, height: _height, width: _width }: SankeyChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(wrapperRef)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fmt = useCallback(
    (v: number) => (currency ? formatBRL(v) : v.toLocaleString('pt-BR')),
    [currency],
  )

  const { svgWidth, svgHeight, layoutNodes, layoutLinks } = useMemo(() => {
    if (nodes.length === 0) return { svgWidth: 0, svgHeight: 0, layoutNodes: [], layoutLinks: [] }
    const svgW = Math.max(300, containerWidth - 4)
    // Probe with generous height to get actual d3-sankey column placement
    // (sink nodes with no outgoing links get placed in the rightmost column
    // regardless of their col metadata, so we can't rely on col counts alone)
    const probe = computeLayout(nodes, links, svgW, 4000)
    const actualMax = maxNodesPerColumn(probe.nodes as LayoutNode[])
    const svgH = Math.max(MIN_HEIGHT, actualMax * 72 + Math.max(0, actualMax - 1) * NODE_PADDING)
    const computed = computeLayout(nodes, links, svgW, svgH)
    return {
      svgWidth: svgW,
      svgHeight: svgH,
      layoutNodes: computed.nodes as LayoutNode[],
      layoutLinks: computed.links as LayoutLink[],
    }
  }, [nodes, links, containerWidth])

  if (nodes.length === 0) return null

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Static preview — non-interactive, scaled to fit card height */}
      <div className="relative overflow-hidden rounded-lg" style={{ height: PREVIEW_HEIGHT }}>
        <svg
          width="100%"
          height={PREVIEW_HEIGHT}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', pointerEvents: 'none' }}
        >
          <SvgContent
            layoutNodes={layoutNodes}
            layoutLinks={layoutLinks}
            fmt={fmt}
            idPrefix="prev-"
            interactive={false}
          />
        </svg>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-black/25 hover:bg-black/50 text-white transition-colors backdrop-blur-sm"
          title="Expandir visualização"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {isModalOpen && (
        <SankeyModal
          nodes={nodes}
          links={links}
          fmt={fmt}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
