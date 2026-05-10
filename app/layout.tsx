import './globals.css'
import type { Metadata, Viewport } from 'next'
import Providers from '@/components/Providers'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'Florim',
  description: 'Gestão financeira familiar com alma vintage',
  icons: {
    icon: [
      { url: '/logo-small.png', sizes: '500x500', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    siteName: 'Florim',
    title: 'Florim — Gestão financeira familiar',
    description: 'Gestão financeira familiar com alma vintage',
    url: 'https://florim.app',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f1eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-paper text-ink font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Florim',
              alternateName: 'Florim App',
              legalName: 'LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA',
              url: 'https://florim.app',
              logo: 'https://florim.app/logo.png',
              email: 'contato@florim.app',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Avenida Paulista, 1106, Sala 01, Andar 16',
                addressLocality: 'São Paulo',
                addressRegion: 'SP',
                postalCode: '01310-914',
                addressCountry: 'BR',
              },
            }),
          }}
        />
        <Providers>
          {children}
        </Providers>
        <CookieBanner />
      </body>
    </html>
  )
}
