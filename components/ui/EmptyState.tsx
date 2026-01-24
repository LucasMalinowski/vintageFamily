'use client'

interface EmptyStateProps {
  message: string
  submessage?: string
  icon?: React.ReactNode
}

export default function EmptyState({ message, submessage, icon }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center text-ink/20">{icon}</div>}
      <p className="text-ink/60 italic font-body mb-2">{message}</p>
      {submessage && <p className="text-ink/40 text-sm">{submessage}</p>}
    </div>
  )
}
