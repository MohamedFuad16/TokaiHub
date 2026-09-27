/**
 * iOS keeps an installed web app suspended, so reopening it does not load a new deploy. When the
 * app comes back after at least 30 s away, compare the live page's app bundle with the running
 * one; if they differ, store the new page for the service worker and reload into it.
 */
const AWAY_MS = 30_000;
const bundleOf = (html: string) => /\/assets\/index-[\w-]+\.js/.exec(html)?.[0] ?? null;

async function checkForUpdate() {
  const running = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src;
  if (!running) return; // dev server: no built bundle
  const res = await fetch(`/?update-check=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return;
  const html = await res.text();
  const live = bundleOf(html);
  if (!live || running.endsWith(live)) return;
  // The service worker falls back to its stored page on a slow network; make that the new one.
  for (const key of await caches.keys()) {
    if (key.startsWith('tokaihub-')) await (await caches.open(key)).put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  }
  location.reload();
}

export function reloadOnNewVersion() {
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) void checkForUpdate().catch(() => {});
  });
}
