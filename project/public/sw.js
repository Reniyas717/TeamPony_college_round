// Nexus Progressive Web App Service Worker
// Cache version identifier
const CACHE_NAME = 'nexus-cache-v2';

// Static shell assets and critical resources to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
];

// Install Event — precache the critical offline shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event — cleanup outdated cache versions and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event — robust caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // In development, local environments, or HMR, bypass cache completely
  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    url.pathname.includes('turbopack') ||
    url.pathname.includes('hot-update') ||
    url.pathname.includes('_next/static/development')
  ) {
    return;
  }

  // Only handle GET requests and same-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Never cache internal API routes or auth endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // 2. Cache-first strategy for immutable static assets (_next/static, icons, fonts)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|woff|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network-first strategy for navigation / document requests with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If response is good, optionally cache this HTML document for offline reading
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed — try to find cached version of this page
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not cached, deliver the branded offline fallback page
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }
          return new Response(
            '<html><body style="background:#0B0A09;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>You are offline</h2><p>Please check your internet connection.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }
});
