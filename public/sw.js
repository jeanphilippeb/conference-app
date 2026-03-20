const CACHE_NAME = 'conference-hq-v1'

const APP_SHELL = [
  '/',
  '/index.html',
]

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL)
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Network-first for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
