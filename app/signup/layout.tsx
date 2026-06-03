import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta no Florim e comece a organizar as finanças da sua família. Grátis por 30 dias.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
