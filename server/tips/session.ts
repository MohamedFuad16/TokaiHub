/**
 * TIPS session manager.
 *
 * Sign-in: a visible Chromium window on this Mac (fresh, isolated profile, no link to the
 * user's Chrome) shows the university Microsoft login. After the student signs in, the
 * cookies move into a headless context and the window closes.
 *
 * TIPS itself idles out after 30 minutes. While the Hub session is alive we re-enter TIPS
 * silently through the Microsoft SSO cookies in the headless context.
 *
 * Dev (default): memory only, Hub session 160 min, nothing on disk.
 * Hosted (TIPS_PERSIST=1, TIPS_HUB_SESSION_MINUTES=0): the cookies are sealed to
 * ~/.tokaihub/tips-session.bin (AES-256-GCM) after sign-in and after each silent re-auth, and
 * restored on restart, so the Mac keeps working for the owner until Microsoft asks for a
 * password again. The session never expires on the Hub side.
 */
import { chromium, type Browser, type BrowserContext } from 'playwright';
import * as cache from './cache';

export const TIPS_ORIGIN = 'https://tips.u-tokai.ac.jp';
export const PORTAL_URL = `${TIPS_ORIGIN}/campusweb/portal.do?page=main`;
const DEFAULT_HUB_MINUTES = Number(process.env.TIPS_HUB_SESSION_MINUTES ?? 160);
const LOGIN_TIMEOUT_MS = 5 * 60_000;
const PERSIST = process.env.TIPS_PERSIST === '1';
const SEALED = 'tips-session';

type State = 'signed_out' | 'signing_in' | 'signed_in';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let state: State = 'signed_out';
let hubExpiresAt = 0;
let expiryTimer: NodeJS.Timeout | null = null;
let loginPromise: Promise<void> | null = null;
let lastError: string | null = null;
/** Student ID the signed-in TIPS session belongs to, once checked (see index.ts). */
let accountId: string | null = null;
export const getAccountId = () => accountId;

/** TIPS keeps the UI language on the server session (portal.do?locale=...). */
export type Locale = 'ja_JP' | 'en_US';
let sessionLocale: Locale | null = null;
export const getSessionLocale = () => sessionLocale;
export const setSessionLocale = (l: Locale | null) => { sessionLocale = l; };

/** Locale the running feature wants, and a lock so features never interleave. */
let wanted: Locale = 'ja_JP';
export const getWantedLocale = () => wanted;
let featureChain: Promise<unknown> = Promise.resolve();
export function runFeature<T>(locale: Locale, fn: () => Promise<T>): Promise<T> {
  const run = featureChain.then(() => { wanted = locale; return fn(); }, () => { wanted = locale; return fn(); });
  featureChain = run.catch(() => {});
  return run;
}

const isPortal = (u: URL) => u.hostname === 'tips.u-tokai.ac.jp' && u.pathname.endsWith('/portal.do');

const expires = () => DEFAULT_HUB_MINUTES > 0;

export function status() {
  if (state === 'signed_in' && expires() && Date.now() >= hubExpiresAt) void signOut();
  const timed = state === 'signed_in' && expires();
  return {
    state,
    hubExpiresAt: timed ? new Date(hubExpiresAt).toISOString() : null,
    minutesLeft: timed ? Math.max(0, Math.round((hubExpiresAt - Date.now()) / 60_000)) : 0,
    lastError,
  };
}

function armExpiry() {
  if (expiryTimer) clearTimeout(expiryTimer);
  if (!expires()) return;
  expiryTimer = setTimeout(() => void signOut(), Math.max(0, hubExpiresAt - Date.now()));
}

export function extend(minutes: number) {
  if (state !== 'signed_in') throw new Error('not signed in');
  hubExpiresAt = Math.max(hubExpiresAt, Date.now()) + minutes * 60_000;
  armExpiry();
  return status();
}

type Storage = Awaited<ReturnType<BrowserContext['storageState']>>;

async function adopt(storage: Storage) {
  browser ??= await chromium.launch({ headless: true });
  context = await browser.newContext({ storageState: storage, locale: 'ja-JP' });
  state = 'signed_in';
  hubExpiresAt = Date.now() + DEFAULT_HUB_MINUTES * 60_000;
  armExpiry();
}

async function persist() {
  if (!PERSIST || !context) return;
  cache.seal(SEALED, { storage: await context.storageState(), accountId });
}

/** Hosted mode: pick the sealed session back up after a restart. */
export async function restore() {
  const saved = PERSIST ? cache.unseal<{ storage: Storage; accountId: string | null }>(SEALED) : null;
  if (!saved) return false;
  accountId = saved.accountId;
  await adopt(saved.storage);
  console.log(`[tips] restored saved session for ${accountId ?? 'unknown account'}`);
  return true;
}

/** Records whose TIPS account this is; index.ts checks it against the owner ID. */
export async function setAccountId(id: string) {
  accountId = id;
  await persist();
}

/** Opens the visible login window on this Mac. Resolves when TIPS portal is reached. */
export function signIn(): Promise<void> {
  if (loginPromise) return loginPromise;
  lastError = null;
  state = 'signing_in';
  loginPromise = (async () => {
    const headed = await chromium.launch({ headless: false });
    try {
      const loginCtx = await headed.newContext({ viewport: { width: 1000, height: 760 }, locale: 'ja-JP' });
      const page = await loginCtx.newPage();
      await page.goto(PORTAL_URL);
      await page.waitForURL(isPortal, { timeout: LOGIN_TIMEOUT_MS });
      accountId = null;
      await adopt(await loginCtx.storageState());
      await persist();
      console.log(`[tips] signed in${expires() ? `; hub session until ${new Date(hubExpiresAt).toLocaleTimeString()}` : ''}`);
    } catch (e) {
      state = 'signed_out';
      lastError = (e as Error).message.split('\n')[0];
      throw e;
    } finally {
      await headed.close().catch(() => {});
      loginPromise = null;
    }
  })();
  return loginPromise;
}

export async function signOut() {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  state = 'signed_out';
  hubExpiresAt = 0;
  const ctx = context;
  context = null;
  worker = null;
  sessionLocale = null;
  accountId = null;
  cache.unsealRemove(SEALED);
  await ctx?.close().catch(() => {});
  console.log('[tips] signed out, cookies dropped');
}

/**
 * Re-enters TIPS after its 30-minute idle timeout, using the Microsoft SSO cookies still held
 * in the headless context. Microsoft may show an account picker; choosing the known account
 * types no password. Throws if Microsoft asks for a password or MFA.
 */
let reauthPromise: Promise<void> | null = null;
export function reauthenticate(): Promise<void> {
  if (reauthPromise) return reauthPromise;
  reauthPromise = (async () => {
    const ctx = requireContext();
    const page = await ctx.newPage();
    try {
      await page.goto(PORTAL_URL);
      const done = page.waitForURL(isPortal, { timeout: 20_000 });
      const tile = page.locator('div[role="listitem"]', { hasText: '@tokai.ac.jp' }).first();
      const picked = tile.waitFor({ timeout: 6_000 }).then(() => tile.click()).catch(() => {});
      await Promise.race([done, picked.then(() => done)]);
      console.log('[tips] silent re-auth OK');
      await persist(); // Microsoft refreshed its cookies
    } catch (e) {
      const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 80);
      // Only a Microsoft page asking for credentials ends the session. A network blip must not
      // throw away the saved sign-in of a machine that runs unattended.
      if (!page.url().includes('login.microsoftonline.com')) throw new Error(`re-auth did not finish: ${(e as Error).message.split('\n')[0]}`);
      await signOut();
      lastError = 'Microsoft asked for sign-in again';
      throw new SessionExpiredError(`silent re-auth failed (${text.replace(/\s+/g, ' ')})`);
    } finally {
      await page.close().catch(() => {});
      reauthPromise = null;
    }
  })();
  return reauthPromise;
}

export class SessionExpiredError extends Error { name = 'SessionExpiredError'; }

/**
 * A headless page parked on a static TIPS URL. Requests run as fetch() inside it, because the
 * TIPS server needs legacy TLS renegotiation that Node's OpenSSL refuses but Chromium accepts.
 */
let worker: import('playwright').Page | null = null;
export async function workerPage() {
  const ctx = requireContext();
  if (worker && !worker.isClosed() && worker.context() === ctx) return worker;
  worker = await ctx.newPage();
  await worker.goto(`${TIPS_ORIGIN}/campusweb/static/pub/campus/6.0/image/icon/sp.gif`);
  return worker;
}

export function requireContext(): BrowserContext {
  status();
  if (state !== 'signed_in' || !context) throw new SessionExpiredError('not signed in');
  return context;
}

/** Process exit. Unlike signOut, keeps the sealed session so a restart picks it back up. */
export async function shutdown() {
  if (expiryTimer) clearTimeout(expiryTimer);
  await persist().catch(() => {});
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}
