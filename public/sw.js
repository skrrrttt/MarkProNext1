/// <reference lib="webworker" />

const CACHE_NAME = 'markpro-v1';
const STATIC_ASSETS = [
  '/',
  '/field/jobs',
  '/admin/dashboard',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests and Supabase calls - let them go to network
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    return;
  }

  // For navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          // Cache the response
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // Fall back to cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          // Fall back to offline page
          return caches.match('/');
        }
      })()
    );
    return;
  }

  // For static assets - stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      // Fetch from network in background
      const networkResponsePromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => null);

      // Return cached response immediately, or wait for network
      return cachedResponse || networkResponsePromise;
    })()
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-changes') {
    event.waitUntil(syncOfflineChanges());
  }
});

async function syncOfflineChanges() {
  // This would be called when back online
  // The actual sync logic is in the React app
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  });
}

// Push notifications (future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
});
