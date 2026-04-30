const CACHE_NAME = 'florim-v2'
const STATIC_ASSETS = ['/pwa-192.png', '/pwa-512.png', '/favicon.ico']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      ),
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  // Navigation (HTML pages): network-first, no cache fallback for stale HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request)
      })
    )
    return
  }

  // Static image/font assets: cache-first
  const url = new URL(request.url)
  if (/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf|otf)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Everything else (Next.js JS/CSS/API): network only
})
