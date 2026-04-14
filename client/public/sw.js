// Service Worker for caching strategy
const CACHE_VERSION = 'alumni-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo-small.png',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.debug('[Service Worker] Caching essential assets');
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.debug(`[Service Worker] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Only handle same-origin requests in the service worker. This avoids
  // intercepting cross-origin resources (like DiceBear) which can trigger
  // CSP/connect-src errors and opaque responses that cause clone issues.
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    return; // let the browser handle cross-origin requests directly
  }

  // Cache-first strategy for static assets
  if (
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.debug(`[Service Worker] Cache hit: ${url.pathname}`);
          return response;
        }

        return fetch(request).then((resp) => {
          // Cache successful, same-origin responses only
          if (resp && resp.ok) {
            caches.open(CACHE_VERSION).then((c) => {
              try {
                // Only cache "basic" responses (same-origin) to avoid opaque/cors issues
                if (resp.type === 'basic') c.put(request, resp.clone());
              } catch (e) {
                console.warn('[Service Worker] Failed to cache response:', e);
              }
            });
          }
          return resp;
        });
      })
    );
  }
  // Network-first strategy for API calls
  else if (url.pathname.startsWith('/api/')) {
    // Network-first for API calls (same-origin only)
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok) {
            caches.open(CACHE_VERSION).then((c) => {
              try {
                if (resp.type === 'basic' || resp.type === 'cors') c.put(request, resp.clone());
              } catch (e) {
                console.warn('[Service Worker] Failed to cache API response:', e);
              }
            });
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
  }
  // Network-first for HTML
  else {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (!resp || !resp.ok) return resp;
          caches.open(CACHE_VERSION).then((c) => {
            try {
              if (resp.type === 'basic') c.put(request, resp.clone());
            } catch (e) {
              console.warn('[Service Worker] Failed to cache HTML response:', e);
            }
          });
          return resp;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
