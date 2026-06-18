import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'
import CookieBanner from '@/components/CookieBanner'
import MobileAppBanner from '@/components/MobileAppBanner'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

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

const OG_LOCALE: Record<string, string> = { 'pt-BR': 'pt_BR', en: 'en_US', es: 'es_ES' }

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'seo.root' })

  return {
    title: {
      default: t('title'),
      template: '%s | Florim',
    },
    description: t('description'),
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
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: 'https://florim.app',
      type: 'website',
      locale: OG_LOCALE[locale] ?? 'pt_BR',
      images: [
        {
          url: '/og',
          width: 1200,
          height: 630,
          alt: t('ogTitle'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('twitterDescription'),
      images: ['/og'],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f5f1eb',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getUserLocale()
  return (
	    <html lang={locale}>
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
