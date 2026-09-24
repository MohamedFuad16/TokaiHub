// TokaiHub service worker: caches the app shell so the PWA opens instantly and offline.
// TIPS data never goes through this cache. /tips-api responses are personal and are kept
// (parsed only) in IndexedDB by the app, which clears them on sign-out.

const CACHE_VERSION = 'tokaihub-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE_VERSION) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/tips-api')) return; // personal data: network only
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return; // Vite dev server

  // Pages: network first, so a new deploy shows up; fall back to the cached shell offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        (await caches.open(CACHE_VERSION)).put('/', res.clone());
        return res;
      } catch {
        return (await caches.match('/')) ?? Response.error();
      }
    })());
    return;
  }

  // Built assets (hashed file names), fonts, icons: cache first, fill on miss.
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE_VERSION)).put(req, res.clone());
    return res;
  })());
});
