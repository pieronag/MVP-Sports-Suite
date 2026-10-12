// Service worker del área Jugador (scope /player/).
// Estrategia: navegaciones network-first con fallback offline;
// estáticos de Next e íconos cache-first; nunca cachea API, auth ni Firestore.
const VERSION = 'mvp-player-v2';
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/player/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/pwa-192.png', '/player/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/monitoring')) return;
  // En desarrollo no se cachea nada (el código cambia en cada edición)
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        if (res.ok) (await caches.open(PAGES_CACHE)).put(request, res.clone());
        return res;
      } catch {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const res = await fetch(request);
      if (res.ok) (await caches.open(STATIC_CACHE)).put(request, res.clone());
      return res;
    })());
  }
});

// Notificaciones push: el servidor envía { title, body, url, tag }
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'MVP Sports';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/pwa-192.png',
    badge: '/icons/pwa-192.png',
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '/player' },
  }));
});

// Al tocar la notificación: enfoca una pestaña abierta de la app o abre la pantalla indicada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/player', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin + '/player')) { await c.focus(); return c.navigate(target); }
    }
    return self.clients.openWindow(target);
  })());
});
