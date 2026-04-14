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

        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(CACHE_VERSION);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
  // Network-first strategy for API calls
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(CACHE_VERSION);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(request);
        })
    );
  }
  // Network-first for HTML
  else {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache error responses
          if (!response.ok) {
            return response;
          }
          const cache = caches.open(CACHE_VERSION);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => {
          // Fall back to cached version if available
          return caches.match(request);
        })
    );
  }
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
