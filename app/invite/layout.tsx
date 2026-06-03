import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Convite',
  description: 'Aceite o convite para entrar no Florim e controlar as finanças da sua família.',
  robots: { index: false, follow: false },
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
