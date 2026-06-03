type ExportValue = string | number | boolean | null | undefined
const FORMULA_PREFIX = /^[=+\-@\t\r]/

export interface ExportTable {
  filename: string
  title: string
  subtitle?: string
  headers: string[]
  rows: ExportValue[][]
}

const escapeCsvCell = (value: ExportValue) => {
  if (value === null || value === undefined) return '""'
  let text = String(value)
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export const buildCsv = (headers: string[], rows: ExportValue[][]) => {
  const lines = [headers.map(escapeCsvCell).join(',')]
  rows.forEach((row) => { lines.push(row.map(escapeCsvCell).join(',')) })
  return lines.join('\n')
}

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.rel = 'noreferrer'
  document.body.appendChild(a); a.click(); a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadCsv = (table: ExportTable) => {
  const csv = buildCsv(table.headers, table.rows)
  downloadTextFile(table.filename, `﻿${csv}`, 'text/csv;charset=utf-8')
}

/** Open an HTML report in a new tab — the page auto-triggers the browser print dialog. */
export const openHtmlAsPdf = (url: string) => {
  const w = window.open(url, '_blank', 'noopener')
  if (w) w.addEventListener('load', () => setTimeout(() => w.print(), 200))
}

// ─── Legacy jsPDF export (used by Comparatives) ──────────────────────────────
export const buildPdfBlob = async (table: ExportTable) => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default ?? autoTableModule.autoTable
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 36
  let y = 36
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
  doc.text(table.title, marginX, y); y += 20
  if (table.subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    const lines = doc.splitTextToSize(table.subtitle, pageWidth - marginX * 2)
    doc.text(lines, marginX, y); y += lines.length * 12 + 8
  }
  autoTable(doc, {
    head: [table.headers],
    body: table.rows.map(row => row.map(c => c == null ? '' : String(c))),
    startY: y, margin: { left: marginX, right: marginX },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [62, 95, 75], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 241, 235] },
  })
  return doc.output('blob')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _logoDataUrl: string | null | undefined = undefined

const loadLogoDataUrl = async (): Promise<string | null> => {
  if (_logoDataUrl !== undefined) return _logoDataUrl
  try {
    const r = await fetch('/logo.png')
    if (!r.ok) { _logoDataUrl = null; return null }
    const b = await r.blob()
    _logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('read error'))
      reader.readAsDataURL(b)
    })
  } catch { _logoDataUrl = null }
  return _logoDataUrl ?? null
}

function catRailColor(label: string): string {
  const root = (label || '').split(' / ')[0].split(' > ')[0].trim()
  if (/^(Casa|Servi[çc]o|Conta|Aluguel)/i.test(root)) return '#3F6E7A'
  if (/^Aliment/i.test(root)) return '#6FBF8A'
  if (/^Lazer/i.test(root)) return '#C2A45D'
  if (/^(Transport|Sa[úu]de|Farm)/i.test(root)) return '#B05C3A'
  if (/^Fam[íi]lia/i.test(root)) return '#3E5F4B'
  if (/^(Renda|Sal[áa]rio|Extra)/i.test(root)) return '#3E8E5C'
  let h = 0
  for (let i = 0; i < root.length; i++) h = (h * 31 + root.charCodeAt(i)) & 0xFFFFFF
  return ['#B05C3A', '#3F6E7A', '#6FBF8A', '#C2A45D', '#3E5F4B'][Math.abs(h) % 5]
}

function statusPill(text: string): string {
  const t = (text || '').toLowerCase()
  let bg = 'rgba(194,164,93,.20)'; let fg = '#A58E5F'
  if (t === 'pago' || t === 'recebido') { bg = 'rgba(111,191,138,.20)'; fg = '#3E8E5C' }
  else if (t === 'atrasado') { bg = 'rgba(176,92,58,.20)'; fg = '#B05C3A' }
  else if (t.includes('confirma') || t === 'a confirmar') { bg = 'rgba(47,111,126,.18)'; fg = '#3F6E7A' }
  return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:${bg};color:${fg}">${text}</span>`
}

// ─── Branded HTML PDF ─────────────────────────────────────────────────────────
export interface BrandedPdfOptions {
  title: string
  filterSummary: string
  headers: string[]
  rows: ExportValue[][]
  cards: Array<{ label: string; value: string }>
  generatedDate: string
  includeSignatures?: boolean
  accentColor?: string
}

export const buildBrandedPdfBlob = async ({
  title,
  filterSummary,
  headers,
  rows,
  cards,
  generatedDate,
  includeSignatures = false,
  accentColor = '#3E5F4B',
}: BrandedPdfOptions): Promise<Blob> => {
  const logoData = await loadLogoDataUrl()

  const catColIdx = headers.findIndex(h => /categ/i.test(h))
  const statusColIdx = headers.findIndex(h => /^status$/i.test(h))
  const valueColIdx = headers.findIndex(h => /^valor$/i.test(h))
  const amountColIdx = valueColIdx >= 0 ? valueColIdx : headers.findIndex(h => /^total$/i.test(h))

  // Table header row
  const thHtml = headers.map(h =>
    `<th style="${/valor|total|meta/i.test(h) ? 'text-align:right' : 'text-align:left'}">${h}</th>`
  ).join('')

  // Table body rows
  const tbodyHtml = rows.map(row => {
    const cells = row.map(c => c == null ? '' : String(c))
    const cat = catColIdx >= 0 ? cells[catColIdx] : ''
    const rail = catRailColor(cat)
    const tds = cells.map((cell, ci) => {
      const h = headers[ci] || ''
      const isAmt = /valor|total|meta/i.test(h)
      const isStatus = statusColIdx === ci
      return `<td style="${isAmt ? 'text-align:right;font-weight:600;font-variant-numeric:tabular-nums;' : ''}">${isStatus ? statusPill(cell) : cell}</td>`
    }).join('')
    return `<tr style="border-left:3px solid ${rail}">${tds}</tr>`
  }).join('\n')

  // Summary footer row
  const tfootHtml = (() => {
    if (amountColIdx < 0 || rows.length === 0) return ''
    const total = rows.reduce((s, r) => {
      const c = r[amountColIdx]
      if (typeof c !== 'string') return s
      const n = parseFloat(c.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.'))
      return s + (isNaN(n) ? 0 : n)
    }, 0)
    if (total === 0) return ''
    const tds = headers.map((_, i) => {
      if (i === amountColIdx) return `<td style="text-align:right;font-weight:700;color:${accentColor};font-variant-numeric:tabular-nums">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>`
      if (i === 0) return `<td style="font-weight:600;color:rgba(47,59,51,.55)">${rows.length} registro${rows.length !== 1 ? 's' : ''}</td>`
      return '<td></td>'
    }).join('')
    return `<tfoot><tr>${tds}</tr></tfoot>`
  })()

  // KPI cards
  const cardsHtml = cards.map(c => `
    <div style="background:#fff;border:1px solid #E4D7C2;border-radius:10px;padding:12px 16px;flex:1;min-width:100px">
      <div style="font-size:8px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:rgba(47,59,51,.55);margin-bottom:5px">${c.label}</div>
      <div style="font-size:18px;font-weight:700;color:#2F3B33;font-variant-numeric:tabular-nums;letter-spacing:-.4px">${c.value}</div>
    </div>`).join('')

  const signaturesHtml = includeSignatures ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px">
      <div><div style="border-top:1px solid #C2A45D;padding-top:6px">
        <p style="font-size:9px;color:rgba(47,59,51,.55)">Assinatura Responsável</p></div></div>
      <div><div style="border-top:1px solid #C2A45D;padding-top:6px">
        <p style="font-size:9px;color:rgba(47,59,51,.55)">Assinatura Financeiro</p></div></div>
    </div>` : ''

  const logoImg = logoData ? `<img src="${logoData}" style="width:28px;height:28px;object-fit:contain" alt="" />` : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title} — Florim</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,sans-serif;background:#F5F1EB;color:#2F3B33;font-size:10px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:820px;margin:0 auto;padding:32px 40px}

/* Header */
.hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #E4D7C2}
.brand{display:flex;align-items:center;gap:10px}
.brand-name{font-family:'Playfair Display',serif;font-size:13px;color:#3E5F4B;line-height:1.2}
.brand-sub{font-size:9px;color:rgba(47,59,51,.45);margin-top:1px}
.gen-date{font-size:9px;color:rgba(47,59,51,.40);padding-top:2px;white-space:nowrap}

/* Title */
.title-block{margin-bottom:16px}
.accent-bar{height:3px;width:40px;border-radius:2px;margin-bottom:12px}
h1{font-family:'Playfair Display',serif;font-size:22px;font-weight:500;color:#3E5F4B;letter-spacing:-.3px;margin-bottom:4px}
.filter{font-size:9.5px;color:rgba(47,59,51,.55);font-style:italic}

/* Cards */
.cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}

/* Table */
.tbl-wrap{background:#fff;border:1px solid #E4D7C2;border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse}
thead{background:#F5F1EB}
th{padding:9px 12px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(47,59,51,.50);border-bottom:1px solid #E4D7C2;white-space:nowrap}
tbody tr{border-bottom:1px solid rgba(228,215,194,.5)}
tbody tr:nth-child(even){background:#FAF9F7}
td{padding:8px 12px;font-size:9.5px;vertical-align:middle}
tfoot tr{background:#F5F1EB}
tfoot td{padding:9px 12px;border-top:1px solid #E4D7C2}

/* Footer */
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #E4D7C2;display:flex;justify-content:space-between;align-items:center;gap:16px}
.footer-quote{font-family:'Playfair Display',serif;font-style:italic;font-size:9px;color:rgba(194,164,93,.9)}
.footer-txt{font-size:8.5px;color:rgba(47,59,51,.38)}

@media print{
  body{background:#fff}
  .page{padding:18px 28px;max-width:none}
  .tbl-wrap{border:1px solid #ddd}
  tr{break-inside:avoid}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
}
</style>
</head>
<body>
<div class="page">
  <div class="hd">
    <div class="brand">
      ${logoImg}
      <div><div class="brand-name">Florim Finanças</div><div class="brand-sub">florim.app</div></div>
    </div>
    <div class="gen-date">Gerado em ${generatedDate}</div>
  </div>

  <div class="title-block">
    <div class="accent-bar" style="background:${accentColor}"></div>
    <h1>${title}</h1>
    ${filterSummary ? `<p class="filter">${filterSummary}</p>` : ''}
  </div>

  <div class="cards">${cardsHtml}</div>

  <div class="tbl-wrap">
    <table>
      <thead><tr>${thHtml}</tr></thead>
      <tbody>${tbodyHtml}</tbody>
      ${tfootHtml}
    </table>
  </div>

  ${signaturesHtml}

  <div class="footer">
    <div class="footer-quote">"Cuidar do dinheiro da casa é cuidar do tempo juntos."</div>
    <div class="footer-txt">Florim &middot; ${generatedDate}</div>
  </div>
</div>
<script>
  window.addEventListener('load',function(){
    if(window.self===window.top) setTimeout(function(){window.print()},300)
  })
</script>
</body>
</html>`

  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
