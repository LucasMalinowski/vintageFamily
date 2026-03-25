'use client'

import { formatBRL } from '@/lib/money'

interface StatCardProps {
  label: string
  value: number // em centavos
  color?: 'olive' | 'terracotta' | 'petrol' | 'coffee' | 'default'
  size?: 'sm' | 'md' | 'lg'
  detail?: React.ReactNode
}

export default function StatCard({ label, value, color = 'default', size = 'md', detail }: StatCardProps) {
  const colorClasses = {
    olive: 'bg-olive text-white',
    terracotta: 'bg-gold text-sidebar',
    petrol: 'bg-petrol text-white',
    coffee: 'bg-sidebar text-paper',
    default: 'bg-bg text-ink border border-border',
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className={`rounded-[20px] shadow-soft ${colorClasses[color]} ${sizeClasses[size]}`}>
      <div className={`text-xs uppercase tracking-wide mb-2 ${color === 'default' ? 'text-ink/60' : 'text-white/80'}`}>
        {label}
      </div>
      <div className={`font-numbers font-semibold ${textSizeClasses[size]}`}>
        {formatBRL(value)}
      </div>
      {detail && <div>{detail}</div>}
    </div>
  )
}
