'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  message: string
  confirmLabel?: string
  confirmAccent?: string
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmAccent = '#B05C3A',
  loading = false,
}: ConfirmModalProps) {
  const t = useTranslations()
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[200]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px]" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-sm bg-bg rounded-[18px] border border-border shadow-[0_20px_48px_rgba(47,59,51,0.14)] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{ background: `${confirmAccent}15`, color: confirmAccent }}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <Dialog.Title className="font-serif text-[17px] text-coffee">{title ?? t('common.confirm')}</Dialog.Title>
                  <p className="text-[13px] text-ink/65 mt-1 leading-snug">{message}</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-[10px] border border-border bg-white text-[13px] font-medium text-ink hover:bg-paper transition-vintage disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-white text-[13px] font-semibold transition-vintage disabled:opacity-50"
                  style={{ background: confirmAccent }}
                >
                  {loading ? t('common.pleaseWait') : (confirmLabel ?? t('common.confirm'))}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
