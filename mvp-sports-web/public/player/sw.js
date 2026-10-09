// Service worker del área Jugador (scope /player/).
// Estrategia: navegaciones network-first con fallback offline;
// estáticos de Next e íconos cache-first; nunca cachea API, auth ni Firestore.
const VERSION = 'mvp-player-v1';
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
