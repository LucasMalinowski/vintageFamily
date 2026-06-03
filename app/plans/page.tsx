import type { Metadata } from 'next'
import PlansContent from './PlansContent'

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Veja os planos do Florim. Compare recursos e escolha o melhor para a sua família. Comece grátis, sem cartão.',
  alternates: { canonical: '/plans' },
  openGraph: {
    title: 'Planos Florim - Gestão financeira familiar',
    description: 'Compare os planos do Florim e comece grátis por 30 dias.',
    url: 'https://florim.app/plans',
  },
}

export default function PlansPage() {
  return <PlansContent />
}
