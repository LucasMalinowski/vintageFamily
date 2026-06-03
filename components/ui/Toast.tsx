'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export type ToastType = 'error' | 'success' | 'info'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
  action?: { label: string; onClick: () => void }
}

let _addToast: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null

export function toast(message: string, options?: { type?: ToastType; action?: { label: string; onClick: () => void } }) {
  _addToast?.({ message, type: options?.type ?? 'info', action: options?.action })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

	  useEffect(() => {
	    const timeoutIds = new Set<ReturnType<typeof setTimeout>>()
	    _addToast = (msg) => {
	      const id = Math.random().toString(36).slice(2)
	      setToasts((prev) => [...prev, { ...msg, id }])
	      const timeoutId = setTimeout(() => {
	        timeoutIds.delete(timeoutId)
	        setToasts((prev) => prev.filter((t) => t.id !== id))
	      }, 5000)
	      timeoutIds.add(timeoutId)
	    }
	    return () => {
	      _addToast = null
	      for (const timeoutId of timeoutIds) {
	        clearTimeout(timeoutId)
	      }
	      timeoutIds.clear()
	    }
	  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[400] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => {
        const isError = t.type === 'error'
        const isSuccess = t.type === 'success'
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[12px] border border-border px-4 py-3.5 shadow-[0_8px_24px_rgba(47,59,51,0.14)] min-w-[280px] max-w-[360px] animate-popup-in"
            style={{ background: isError ? '#fff0ed' : isSuccess ? '#f0faf4' : '#fff' }}
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B05C3A]" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3E8E5C]" />
            ) : null}
            <p className="flex-1 text-[13px] text-ink leading-snug">{t.message}</p>
	            {t.action && (
	              <button
	                type="button"
	                onClick={() => { t.action!.onClick(); dismiss(t.id) }}
	                className="text-[12px] font-semibold text-coffee underline shrink-0"
	              >
                {t.action.label}
              </button>
            )}
	            <button type="button" onClick={() => dismiss(t.id)} className="text-ink/35 hover:text-ink shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
