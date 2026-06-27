// pdfjs-dist (used by pdf-parse) calls `new DOMMatrix()` at module init time in Node.js.
// @napi-rs/canvas provides this polyfill, but only when its native binary loads successfully.
// On Vercel the binary may not resolve, so we pre-set the globals from geometry.js (pure JS)
// before pdf-parse's CJS bundle is ever required.
/* eslint-disable @typescript-eslint/no-require-imports */
if (typeof globalThis.DOMMatrix === 'undefined') {
  const { DOMMatrix, DOMPoint, DOMRect } = require('@napi-rs/canvas/geometry') as {
    DOMMatrix: new (...args: unknown[]) => unknown
    DOMPoint: new (...args: unknown[]) => unknown
    DOMRect: new (...args: unknown[]) => unknown
  }
  ;(globalThis as Record<string, unknown>).DOMMatrix = DOMMatrix
  ;(globalThis as Record<string, unknown>).DOMPoint = DOMPoint
  ;(globalThis as Record<string, unknown>).DOMRect = DOMRect
}
/* eslint-enable @typescript-eslint/no-require-imports */

export const PDF_EXTRACT_MAX_PAGES = 3

export type PdfExtractionResult = {
  text: string
  totalPages: number
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText({ first: PDF_EXTRACT_MAX_PAGES })
  return { text: result.text?.trim() ?? '', totalPages: result.total }
}
