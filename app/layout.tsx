import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'
import CookieBanner from '@/components/CookieBanner'
import MobileAppBanner from '@/components/MobileAppBanner'

const organizationJsonLd = {
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
}

export const metadata: Metadata = {
  title: {
    default: 'Florim - Gestão financeira familiar',
    template: '%s | Florim',
  },
  description: 'Gestão financeira familiar com alma vintage. Controle suas finanças em família, com despesas, receitas, objetivos financeiros e insights semanais.',
  metadataBase: new URL('https://florim.app'),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/logo-small.png', sizes: '500x500', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    siteName: 'Florim',
    title: 'Florim - Gestão financeira familiar',
    description: 'Gestão financeira familiar com alma vintage. Controle suas finanças em família, com despesas, receitas, objetivos financeiros e insights semanais.',
    url: 'https://florim.app',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
        alt: 'Florim - Gestão financeira familiar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Florim - Gestão financeira familiar',
    description: 'Gestão financeira familiar com alma vintage.',
    images: ['/og'],
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
	        <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
	        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <Providers>
          {children}
        </Providers>
        <MobileAppBanner />
        <CookieBanner />
      </body>
    </html>
  )
}
