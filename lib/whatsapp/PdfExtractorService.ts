import { PDFParse } from 'pdf-parse'

export const PDF_EXTRACT_MAX_PAGES = 3

export type PdfExtractionResult = {
  text: string
  totalPages: number
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText({ first: PDF_EXTRACT_MAX_PAGES })
  return { text: result.text?.trim() ?? '', totalPages: result.total }
}
