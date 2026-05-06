import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'Florim',
  description: 'Gestão financeira familiar com alma vintage',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo-small.png', sizes: '500x500', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Florim',
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
        <PwaInstallPrompt />
        {process.env.NODE_ENV === 'production' && (
          <Script id="sw-register" strategy="afterInteractive">
            {`
              if ('serviceWorker' in navigator) {
                // Throttle: check for SW updates at most once per hour to avoid
                // triggering a controllerchange reload during PWA resume/background.
                var SW_UPDATE_KEY = 'sw_last_update';
                var SW_UPDATE_INTERVAL = 60 * 60 * 1000;

                function throttledUpdate(registration) {
                  try {
                    var last = parseInt(localStorage.getItem(SW_UPDATE_KEY) || '0', 10);
                    if (Date.now() - last > SW_UPDATE_INTERVAL) {
                      localStorage.setItem(SW_UPDATE_KEY, String(Date.now()));
                      registration.update().catch(function() {});
                    }
                  } catch(e) {}
                }

                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                    .then(function(registration) {
                      throttledUpdate(registration);
                      document.addEventListener('visibilitychange', function() {
                        if (document.visibilityState === 'visible') {
                          throttledUpdate(registration);
                        }
                      });
                    })
                    .catch(function() {});
                });
              }
            `}
          </Script>
        )}
      </body>
    </html>
  )
}
