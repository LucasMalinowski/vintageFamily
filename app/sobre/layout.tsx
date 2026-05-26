import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre o Florim',
  description: 'Conheça a história do Florim, o app de gestão financeira familiar com alma vintage feito no Brasil.',
  alternates: { canonical: '/sobre' },
  openGraph: {
    title: 'Sobre o Florim',
    description: 'A história do app de finanças familiares com alma vintage.',
    url: 'https://florim.app/sobre',
  },
}

export default function SobreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
