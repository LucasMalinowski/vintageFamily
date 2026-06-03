import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Veja os planos do Florim. Compare recursos e escolha o melhor para a sua família.',
  alternates: { canonical: '/plans' },
  openGraph: {
    title: 'Planos Florim',
    description: 'Compare os planos do Florim e comece grátis por 30 dias.',
    url: 'https://florim.app/plans',
  },
}

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
