'use client'

import Modal from '@/components/ui/Modal'

interface PdfPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  summary: string
  pdfUrl: string
  isGenerating?: boolean
  error?: string | null
  showSignaturesToggle?: boolean
  includeSignatures?: boolean
  onToggleSignatures?: (nextValue: boolean) => void | Promise<void>
  onDownload: () => void | Promise<void>
  downloadLabel?: string
  previewLabel?: string
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  title,
  summary,
  pdfUrl,
  isGenerating = false,
  error = null,
  showSignaturesToggle = false,
  includeSignatures = false,
  onToggleSignatures,
  onDownload,
  downloadLabel = 'Imprimir ou salvar',
  previewLabel = 'Preview do PDF',
}: PdfPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink/60">{summary}</p>
          {showSignaturesToggle && onToggleSignatures ? (
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(event) => onToggleSignatures(event.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              Assinaturas
            </label>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-paper overflow-hidden">
          {pdfUrl ? (
            <iframe
              title={previewLabel}
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=90`}
              className="h-[70vh] w-full"
            />
          ) : error ? (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center text-sm text-ink/60">
              {isGenerating ? 'Gerando pré-visualização do PDF...' : 'Clique em "Imprimir ou salvar" para gerar o PDF.'}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-ink/70 transition-vintage hover:bg-offWhite"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={!pdfUrl || isGenerating}
            className="rounded-full border border-sidebar bg-bg px-5 py-3 text-sm font-semibold text-coffee disabled:opacity-60"
          >
            {downloadLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
