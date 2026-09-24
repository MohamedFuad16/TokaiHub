/**
 * Data hook for TIPS features. Paints from memory, then from the bridge's disk cache, then
 * refreshes from TIPS. Screens share one in-memory store, so switching routes does not refetch.
 */
import { useCallback, useEffect, useState } from 'react';
import { getCached, getFeature, SignedOutError, type FeatureParams } from './api';
import { readLocal, writeLocal, clearLocal } from './localCache';

interface Entry { data: unknown; cachedAt: number; stale: boolean; changedAt?: number }
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<Entry>>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(l => l());

/**
 * UI language, sent with every request so TIPS answers in that language (TIPS has an
 * English mode). App sets it; changing it re-keys every screen's data.
 */
let tipsLang: 'en' | 'jp' = 'jp';
export function setTipsLang(lang: 'en' | 'jp') {
  if (lang === tipsLang) return;
  tipsLang = lang;
  notify();
}
// An explicit `lang` param wins (used to read TIPS's Japanese labels while the UI is in English).
const withLang = (params?: FeatureParams): FeatureParams => ({ lang: tipsLang, ...(params ?? {}) });
const keyOf = (feature: string, params?: FeatureParams) => `${feature}${JSON.stringify(withLang(params))}`;

/** Fired when the bridge reports the TIPS session ended; App listens and shows sign-in. */
export const SIGNED_OUT_EVENT = 'tokaihub:signed-out';

function load(feature: string, params: FeatureParams | undefined, refresh: boolean) {
  const key = keyOf(feature, params);
  const running = inflight.get(key);
  if (running && !refresh) return running;
  const p = getFeature(feature, withLang(params), { refresh })
    .then(env => {
      const prev = store.get(key);
      const changed = !prev || JSON.stringify(prev.data) !== JSON.stringify(env.data);
      const e = { data: env.data, cachedAt: env.cachedAt, stale: false, changedAt: changed ? Date.now() : prev?.changedAt };
      store.set(key, e);
      void writeLocal(key, { data: env.data, cachedAt: env.cachedAt });
      if (changed && prev) window.dispatchEvent(new CustomEvent(UPDATED_EVENT, { detail: key }));
      return e;
    })
    .finally(() => { inflight.delete(key); notify(); });
  inflight.set(key, p);
  return p;
}

export function clearTipsStore() { store.clear(); void clearLocal(); notify(); }

/** Fired when a background refresh brought different data (App shows a small indicator). */
export const UPDATED_EVENT = 'tokaihub:updated';
/** Background refresh interval while the tab is visible. */
const REFRESH_MS = 5 * 60_000;

/** Drop cached entries for a feature so the next render refetches (after register/drop). */
export function invalidate(feature: string) {
  for (const k of [...store.keys()]) if (k.startsWith(feature + '{')) store.delete(k);
  notify();
}

export function useTips<T>(feature: string, params?: FeatureParams, opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const key = keyOf(feature, params);
  const [, force] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const l = () => force(n => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setError(null);
    (async () => {
      // 1) this device's saved copy (instant, works across launches)
      if (!store.has(key)) {
        const local = await readLocal(key);
        if (local && !cancelled && !store.has(key)) { store.set(key, { data: local.data, cachedAt: local.cachedAt, stale: true }); notify(); }
      }
      // 2) the bridge's encrypted cache, 3) TIPS
      if (!store.has(key)) {
        try {
          const env = await getCached<T>(feature, withLang(params));
          if (!cancelled && !store.has(key)) { store.set(key, { data: env.data, cachedAt: env.cachedAt, stale: env.stale }); notify(); }
        } catch { /* nothing cached yet */ }
      }
      try {
        await load(feature, params, false);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof SignedOutError) window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
        setError(e as Error);
      }
    })();
    // Keep pulling in the background while visible, and when the tab comes back.
    const tick = () => { if (document.visibilityState === 'visible') load(feature, params, false).catch(() => {}); };
    const id = window.setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, tipsLang]);

  const refresh = useCallback(async () => {
    setError(null);
    try { await load(feature, params, true); }
    catch (e) {
      if (e instanceof SignedOutError) window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
      setError(e as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const entry = store.get(key);
  return {
    data: entry?.data as T | undefined,
    cachedAt: entry?.cachedAt ?? null,
    loading: inflight.has(key),
    /** Time the data last changed; use as a motion key to animate fresh values in. */
    changedAt: entry?.changedAt ?? null,
    error,
    refresh,
  };
}
