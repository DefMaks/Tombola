// Service Worker pour PWA & Notifications Push - Punchy
const CACHE_NAME = 'punchy-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/P-punchy-emblem.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache soft failure:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Interception fetch pour assurer la conformité d'installation PWA Android (WebAPK)
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Ne pas cacher les appels API dynamiques
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && (event.request.mode === 'navigate' || url.origin === self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        return new Response('Connexion indisponible', { status: 503, statusText: 'Offline' });
      })
  );
});

// Réception d'une notification Push Web
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Punchy', body: event.data.text() };
    }
  }

  const title = data.title || 'Punchy';
  const options = {
    body: data.body || 'Nouveau tirage ou round disponible sur Punchy !',
    icon: data.icon || '/P-punchy-emblem.png',
    badge: data.badge || '/P-punchy-emblem.png',
    image: data.image || null,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: data.timestamp || Date.now(),
    },
    actions: [
      { action: 'open', title: 'Participer' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Gestion du clic sur la notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte, la focaliser et naviguer
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
