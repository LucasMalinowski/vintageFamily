import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface VintageCardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function VintageCard({ children, className, padding = 'md' }: VintageCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div className={clsx(
      'bg-paper-2 rounded-[8px] border border-border shadow-soft',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}
