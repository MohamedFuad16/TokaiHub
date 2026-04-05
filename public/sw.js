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
  // Pass-through — no caching yet
  event.respondWith(fetch(event.request));
});
