import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Livro de Finanças da Família',
  description: 'Gestão financeira familiar com alma vintage',
  manifest: '/manifest.json',
  themeColor: '#3E5F4B',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finanças',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="grain">
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && (
          <Script id="sw-register" strategy="afterInteractive">
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `}
          </Script>
        )}
      </body>
    </html>
  )
}
