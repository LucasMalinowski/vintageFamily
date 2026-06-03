'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'

interface RightDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  accent?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function RightDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  accent,
  children,
  size = 'md',
}: RightDrawerProps) {
  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-[1px]" />
        </Transition.Child>

        {/* Positioning container — center on mobile, right on desktop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 md:translate-x-full"
          enterTo="opacity-100 md:translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 md:translate-x-0"
          leaveTo="opacity-0 md:translate-x-full"
        >
          <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center md:items-stretch md:justify-end md:overflow-hidden md:p-0">
            <Dialog.Panel
              className={`
                w-full ${sizeClasses[size]} md:max-w-none md:w-[460px]
                bg-bg flex flex-col border border-border shadow-[0_20px_48px_rgba(47,59,51,0.16)]
                rounded-vintage md:rounded-none
                max-h-[calc(100vh-2rem)] md:max-h-none md:h-full
              `}
              style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
            >
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
                <div className="min-w-0 pr-4">
                  <Dialog.Title className="text-[22px] font-serif text-coffee leading-tight">
                    {title}
                  </Dialog.Title>
                  {subtitle && (
                    <p
                      className="text-[12.5px] italic mt-1 leading-snug"
                      style={{ color: accent ?? '#3E5F4B' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-ink/40 hover:text-ink transition-vintage shrink-0 mt-0.5"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
                {children}
              </div>
            </Dialog.Panel>
          </div>
        </Transition.Child>
      </Dialog>
    </Transition>
  )
}
