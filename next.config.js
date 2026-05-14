const isDev = process.env.NODE_ENV !== 'production'

const scriptSrc = ["'self'", "'unsafe-inline'", 'https://js.stripe.com']
const connectSrc = [
  "'self'",
  'https://*.supabase.co',
  'https://api.stripe.com',
  'https://*.posthog.com',
  'https://*.i.posthog.com',
]

if (isDev) {
  scriptSrc.push("'unsafe-eval'")
  connectSrc.push('ws:', 'http://localhost:*', 'http://127.0.0.1:*')
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  `connect-src ${connectSrc.join(' ')}`,
  `script-src ${scriptSrc.join(' ')}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  'frame-src https://js.stripe.com https://hooks.stripe.com',
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
