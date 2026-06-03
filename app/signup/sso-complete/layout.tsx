import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Concluir cadastro',
  description: 'Complete seu cadastro no Florim para começar a organizar as finanças da sua família.',
  robots: { index: false, follow: false },
}

export default function SSOCompleteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
