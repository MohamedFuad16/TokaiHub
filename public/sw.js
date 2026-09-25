// TokaiHub service worker: stores the whole app (precache.json, written by the build) when it
// installs, so every screen opens instantly and offline, not only screens already visited.
// TIPS data never goes through this cache. /tips-api responses are personal and are kept
// (parsed only) in IndexedDB by the app, which clears them on sign-out.

const CACHE_VERSION = 'tokaihub-v4';

// The build's file list; fetched fresh so a new deploy precaches its own files.
async function precacheList() {
  try {
    const res = await fetch('/precache.json', { cache: 'no-store' });
    return res.ok ? await res.json() : ['/'];
  } catch {
    return ['/'];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const files = await precacheList();
    // One failed file must not stop the others (a font blocked by a network filter, say).
    await Promise.all(files.map(f => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE_VERSION) await caches.delete(key);
    // Drop hashed files from earlier deploys; they are never requested again.
    const keep = new Set((await precacheList()).map(f => new URL(f, self.location.origin).href));
    const cache = await caches.open(CACHE_VERSION);
    for (const req of await cache.keys()) {
      if (new URL(req.url).pathname.startsWith('/assets/') && !keep.has(req.url)) await cache.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/tips-api')) return; // personal data: network only
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/')) return; // Vite dev server

  // Pages: network first so a new deploy shows up, but give up after 2.5 s on a weak signal
  // and open the stored app instead of a blank screen.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const network = fetch(req).then(res => {
        if (res.ok) cache.put('/', res.clone());
        return res;
      });
      const timeout = new Promise(resolve => setTimeout(resolve, 2500));
      const first = await Promise.race([network.catch(() => null), timeout]);
      if (first) return first;
      return (await cache.match('/')) ?? network.catch(() => Response.error());
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

// Push messages from the Mac's bridge (server/tips/push.ts). They use the declarative Web Push
// format, which iOS 18.4+ shows without running this code; other browsers land here.
self.addEventListener('push', (event) => {
  let n = {};
  try { n = event.data?.json()?.notification ?? {}; } catch { n = { title: 'TokaiHub', body: event.data?.text() ?? '' }; }
  event.waitUntil((async () => {
    await self.registration.showNotification(n.title || 'TokaiHub', {
      body: n.body || '', tag: n.tag, lang: n.lang, icon: '/icons/icon-192x192.png', badge: '/icons/icon-192x192.png',
      data: { navigate: n.navigate || '/' },
    });
    if (typeof n.app_badge === 'number' && self.navigator.setAppBadge) {
      await (n.app_badge > 0 ? self.navigator.setAppBadge(n.app_badge) : self.navigator.clearAppBadge()).catch(() => {});
    }
  })());
});

// Tapping a notification opens its screen, reusing an open window when there is one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.navigate || '/', self.location.origin);
  if (target.origin !== self.location.origin) target.href = new URL(target.pathname + target.search, self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find(w => new URL(w.url).origin === self.location.origin);
    if (win) { await win.focus(); return win.navigate(target.href).catch(() => {}); }
    return self.clients.openWindow(target.href);
  })());
});
