import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Envie seu feedback, sugestão ou reporte um bug para a equipe do Florim.',
  robots: { index: false, follow: false },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
