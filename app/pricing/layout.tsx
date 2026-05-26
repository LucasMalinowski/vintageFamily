import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planos e preços',
  description: 'Conheça os planos do Florim. Comece grátis por 30 dias e organize as finanças da sua família com o plano que cabe no seu bolso.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Planos Florim - Gestão financeira familiar',
    description: 'Teste grátis por 30 dias. Assine e controle as finanças da família com Florim Pro.',
    url: 'https://florim.app/pricing',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
