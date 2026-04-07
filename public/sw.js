// TokaiHub Service Worker — Minimal shell for PWA installability
// No caching strategy yet — just pass-through fetch

const CACHE_VERSION = 'tokaihub-v1';

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients so the SW controls all pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests — let cross-origin requests (API calls, etc.) bypass the SW entirely
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
  }
});
