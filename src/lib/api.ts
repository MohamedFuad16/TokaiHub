/**
 * TokaiHub API layer. Every call goes to the TIPS bridge (server/), which signs in to TIPS
 * through the student's Microsoft account, parses TIPS pages, and caches the JSON encrypted
 * on the owner's Mac.
 *
 * On the Mac itself (localhost) the app talks to the bridge's local listener at /tips-api.
 * Anywhere else (the hosted site on a phone) it calls VITE_TIPS_BRIDGE_URL, the public
 * listener behind the Cloudflare tunnel, with the device token that a passkey unlock returns.
 */
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { TipsEnvelope, TipsStatus } from './types';

export const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const BASE = IS_LOCAL ? '/tips-api' : ((import.meta.env.VITE_TIPS_BRIDGE_URL as string | undefined) ?? '/tips-api');

export class SignedOutError extends Error { name = 'SignedOutError'; }
/** The device has no valid token: unlock with the passkey. */
export class LockedError extends Error { name = 'LockedError'; }
export const LOCKED_EVENT = 'tokaihub:locked';

const TOKEN_KEY = 'tokaihub_device_token';
export function getDeviceToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setDeviceToken(token: string | null) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}
/** The phone needs a passkey unlock before it can call the bridge. */
export const needsUnlock = () => !IS_LOCAL && !getDeviceToken();

async function call<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const token = IS_LOCAL ? null : getDeviceToken();
  const go = () => fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
    signal: init?.signal ?? AbortSignal.timeout(init?.timeoutMs ?? 120_000),
  });
  // A phone on mobile data drops the odd request ("Load failed" in Safari). Reads retry once;
  // writes never do, so a registration is not sent twice.
  const res = await go().catch(async (e: Error) => {
    if (e.name !== 'TypeError' || (init?.method ?? 'GET') !== 'GET' || init?.signal?.aborted) throw e;
    await new Promise(r => setTimeout(r, 1500));
    return go();
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && body.error === 'locked') {
    setDeviceToken(null);
    window.dispatchEvent(new Event(LOCKED_EVENT));
    throw new LockedError('locked');
  }
  if (res.status === 401) throw new SignedOutError('signed out');
  if (!res.ok) throw Object.assign(new Error(body.error ?? `bridge ${res.status}`), { status: res.status });
  return body as T;
}

export const getStatus = () => call<TipsStatus>('/status', { timeoutMs: 8_000 });

/** Opens the Microsoft sign-in window on the Mac; resolves once TIPS is reached. Mac only. */
export const signIn = () => call<TipsStatus>('/signin', { method: 'POST', timeoutMs: 6 * 60_000 });

/** Mac only: a one-time code for adding a phone's passkey (valid 10 minutes). */
export const createSetupCode = () => call<{ code: string; expiresAt: string }>('/auth/setup-code', { method: 'POST', timeoutMs: 10_000 });

/** Face ID / Touch ID unlock. Stores the device token the bridge returns. */
export async function unlockWithPasskey() {
  const options = await call<any>('/auth/options', { method: 'POST', timeoutMs: 15_000 });
  const response = await startAuthentication({ optionsJSON: options });
  const { token } = await call<{ token: string }>('/auth/unlock', { method: 'POST', body: JSON.stringify({ response, label: deviceLabel() }), timeoutMs: 15_000 });
  setDeviceToken(token);
}

/** A device signed in with a passkey (one synced passkey can serve an iPhone and a Mac). */
export interface HubSession { id: string; label: string | null; createdAt: string | null; lastUsedAt: string | null; current: boolean }
/** A passkey; `label` is the device it was created on. */
export interface HubDevice { id: string; label: string; createdAt: string; lastUsedAt: string | null; synced: boolean; sessions: HubSession[] }
export const listDevices = () => call<HubDevice[]>('/auth/devices', { timeoutMs: 10_000 });
/** Forgets a passkey and signs out every device using it. */
export const removeDevice = (id: string) => call<HubDevice[]>('/auth/devices/remove', { method: 'POST', body: JSON.stringify({ id }), timeoutMs: 10_000 });
/** Signs one device out; its passkey stays. Signing out the device you are on locks it. */
export const removeSession = (id: string) => call<HubDevice[]>('/auth/sessions/remove', { method: 'POST', body: JSON.stringify({ id }), timeoutMs: 10_000 });

/** A readable name for this device, e.g. "iPhone · Safari" or "Mac · Chrome". */
export function deviceLabel() {
  const ua = navigator.userAgent;
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const platform = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || touchMac ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${platform} · ${browser}` : platform;
}

/** Adds this device's passkey using a setup code shown on the Mac, then unlocks. */
export async function registerPasskey(code: string, label: string) {
  const options = await call<any>('/auth/register/options', { method: 'POST', body: JSON.stringify({ code }), timeoutMs: 15_000 });
  const response = await startRegistration({ optionsJSON: options });
  const { token } = await call<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ code, response, label }), timeoutMs: 15_000 });
  setDeviceToken(token);
}

/** On the Mac: signs out of TIPS. On a phone: locks this device (the Mac stays signed in). */
export async function signOut(clearCache = false) {
  try { return await call<TipsStatus>('/signout', { method: 'POST', body: JSON.stringify({ clearCache }) }); }
  finally { if (!IS_LOCAL) setDeviceToken(null); }
}

export const extendSession = (minutes: number) =>
  call<TipsStatus>('/extend', { method: 'POST', body: JSON.stringify({ minutes }) });

export type FeatureParams = Record<string, string | number | undefined>;

function qs(params: FeatureParams = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** Cached copy only (instant). Rejects with status 404 when nothing is cached yet. */
export const getCached = <T>(feature: string, params?: FeatureParams, signal?: AbortSignal) =>
  call<TipsEnvelope<T>>(`/data/${feature}${qs({ ...params, mode: 'cache' })}`, { signal });

/** Fresh-enough data: the bridge serves its cache inside the feature's TTL, else asks TIPS. */
export const getFeature = <T>(feature: string, params?: FeatureParams, opts: { refresh?: boolean; signal?: AbortSignal } = {}) =>
  call<TipsEnvelope<T>>(`/data/${feature}${qs({ ...params, refresh: opts.refresh ? 1 : undefined })}`, { signal: opts.signal });

/** Write action on the student's TIPS record (register / drop). Only call after the student confirms. */
export const runAction = <T>(action: 'register' | 'drop', body: Record<string, string>) =>
  call<T>(`/action/${action}`, { method: 'POST', body: JSON.stringify({ ...body, confirm: true }), timeoutMs: 120_000 });

/**
 * A TIPS file the bridge can stream: a cabinet file (fileId + folderId), a file attached to a
 * syllabus field, or a bulletin attachment. Cabinet entries that point outside TIPS carry `url`.
 */
export type TipsFileRef =
  | { url?: string; fileId?: string; folderId?: string }
  | { kind: 'syllabus'; year: string; code: string; column: string; renban: string; locale: 'ja_JP' | 'en_US' }
  | { kind: 'bulletin'; id: string; index: string };

/** URL that downloads a TIPS file through the bridge (external files keep their own URL). */
export const tipsFileUrl = (f: TipsFileRef) =>
  'kind' in f ? `${BASE}/file${qs(f)}` : f.url ?? `${BASE}/file?fileId=${f.fileId}&folderId=${f.folderId}`;

/**
 * Opens a TIPS file from a click. Off the Mac a plain link cannot carry the device token,
 * so the tab opens first (keeps the click's popup permission) and then loads a one-minute link.
 */
export function openTipsFile(f: TipsFileRef) {
  if (('url' in f && f.url) || IS_LOCAL) { window.open(tipsFileUrl(f), '_blank', 'noopener'); return; }
  const tab = window.open('', '_blank');
  call<{ ticket: string }>('/file-ticket', { method: 'POST', body: JSON.stringify(f), timeoutMs: 15_000 })
    .then(({ ticket }) => { if (tab) tab.location.href = `${BASE}/file?ticket=${encodeURIComponent(ticket)}`; })
    .catch(() => tab?.close());
}
