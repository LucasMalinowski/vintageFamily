type ExportValue = string | number | boolean | null | undefined

export interface ExportTable {
  filename: string
  title: string
  subtitle?: string
  headers: string[]
  rows: ExportValue[][]
}

const escapeCsvCell = (value: ExportValue) => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export const buildCsv = (headers: string[], rows: ExportValue[][]) => {
  const lines = [headers.map(escapeCsvCell).join(',')]
  rows.forEach((row) => {
    lines.push(row.map(escapeCsvCell).join(','))
  })
  return lines.join('\n')
}

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const downloadCsv = (table: ExportTable) => {
  const csv = buildCsv(table.headers, table.rows)
  downloadTextFile(table.filename, `\ufeff${csv}`, 'text/csv;charset=utf-8')
}

export const buildPdfBlob = async (table: ExportTable) => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const autoTable = autoTableModule.default ?? autoTableModule.autoTable
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 36
  let cursorY = 36

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(table.title, marginX, cursorY)
  cursorY += 20

  if (table.subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const subtitleLines = doc.splitTextToSize(table.subtitle, pageWidth - marginX * 2)
    doc.text(subtitleLines, marginX, cursorY)
    cursorY += subtitleLines.length * 12 + 8
  }

  autoTable(doc, {
    head: [table.headers],
    body: table.rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))),
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [62, 95, 75],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 241, 235],
    },
  })

  return doc.output('blob')
}

export const downloadPdf = async (table: ExportTable) => {
  const blob = await buildPdfBlob(table)
  downloadBlob(table.filename, blob)
}

// Module-level logo cache so every PDF in the same session reuses one fetch
let _logoDataUrl: string | null | undefined = undefined

const loadLogoDataUrl = async (): Promise<string | null> => {
  if (_logoDataUrl !== undefined) return _logoDataUrl
  try {
    const response = await fetch('/logo.png')
    if (!response.ok) { _logoDataUrl = null; return null }
    const blob = await response.blob()
    _logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read logo'))
      reader.readAsDataURL(blob)
    })
  } catch {
    _logoDataUrl = null
  }
  return _logoDataUrl ?? null
}

export interface BrandedPdfOptions {
  title: string
  filterSummary: string
  headers: string[]
  rows: ExportValue[][]
  cards: Array<{ label: string; value: string }>
  generatedDate: string
  includeSignatures?: boolean
}

export const buildBrandedPdfBlob = async ({
  title,
  filterSummary,
  headers,
  rows,
  cards,
  generatedDate,
  includeSignatures = false,
}: BrandedPdfOptions): Promise<Blob> => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default ?? autoTableModule.autoTable
  const logoData = await loadLogoDataUrl()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setFillColor(244, 239, 230)
  doc.rect(0, 0, 210, 297, 'F')

  if (logoData) {
    doc.addImage(logoData, 'PNG', 24, 14, 10, 10)
  }

  doc.setTextColor(90, 70, 51)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Florim Finanças', logoData ? 38 : 24, 20)

  doc.setTextColor(46, 42, 36)
  doc.setFontSize(18)
  doc.text(title, 24, 30)
  doc.setFontSize(10)
  doc.setTextColor(107, 98, 90)
  doc.text(`Filtro: ${filterSummary}`, 24, 36)

  const cardY = 42
  const cardW = 52
  const cardH = 18
  const cardGap = 6

  cards.forEach((card, index) => {
    const x = 24 + index * (cardW + cardGap)
    doc.setDrawColor(217, 207, 191)
    doc.setFillColor(239, 231, 218)
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD')
    doc.setTextColor(138, 127, 116)
    doc.setFontSize(8)
    doc.text(card.label, x + 4, cardY + 6)
    doc.setTextColor(46, 42, 36)
    doc.setFontSize(11)
    doc.text(card.value, x + 4, cardY + 13)
  })

  autoTable(doc, {
    startY: cardY + cardH + 8,
    head: [headers],
    body: rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))),
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [46, 42, 36],
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [244, 239, 230],
      textColor: [125, 115, 104],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 243, 236],
    },
    tableLineColor: [217, 207, 191],
    tableLineWidth: 0.1,
    margin: { left: 24, right: 24 },
  })

  const footerY = (doc as any).lastAutoTable?.finalY
    ? (doc as any).lastAutoTable.finalY + 10
    : 260
  doc.setFontSize(9)
  doc.setTextColor(155, 144, 133)
  doc.text(`Gerado em ${generatedDate}`, 24, footerY)

  if (includeSignatures) {
    const lineY = footerY + 12
    doc.setDrawColor(205, 191, 176)
    doc.line(24, lineY, 95, lineY)
    doc.line(115, lineY, 186, lineY)
    doc.setFontSize(9)
    doc.setTextColor(138, 127, 116)
    doc.text('Assinatura Responsavel', 24, lineY + 5)
    doc.text('Assinatura Financeiro', 115, lineY + 5)
  }

  return doc.output('blob')
}
