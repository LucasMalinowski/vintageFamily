'use client'

import { Plus } from 'lucide-react'

interface FabButtonProps {
  onClick: () => void
  label?: string
  icon?: React.ReactNode
  position?: 'bottom-right' | 'bottom-left' | 'top-right'
}

export default function FabButton({ 
  onClick, 
  label, 
  icon = <Plus className="w-6 h-6" />,
  position = 'bottom-right'
}: FabButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
  }

  return (
    <button
      onClick={onClick}
      className={`
        fixed ${positionClasses[position]} z-40
        w-14 h-14 bg-fabGreen text-white rounded-full 
        shadow-vintage flex items-center justify-center 
        hover:bg-fabGreen/90 transition-vintage
        group
      `}
      title={label}
    >
      {icon}
      {label && (
        <span className="absolute right-full mr-3 px-3 py-2 bg-coffee text-paper text-sm font-body rounded-lg opacity-0 group-hover:opacity-100 transition-vintage whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  )
}
