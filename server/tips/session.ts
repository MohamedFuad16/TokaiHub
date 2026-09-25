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
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import * as cache from './cache';
import { driveMicrosoftLogin, needsMicrosoftInput, type MfaPrompt } from './msLogin';
import { autoLoginConfigured, autoLoginKnown } from './keychain';

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
/**
 * Second factor waiting on the owner during an unattended sign-in (msLogin.ts): the number to
 * enter in Microsoft Authenticator, or a push to approve.
 */
let mfa: MfaPrompt | null = null;
const mfaHooks = { prompt: (p: MfaPrompt | null) => { mfa = p; } };
// Headless Chromium says so in its user agent; Microsoft treats that as a bot on its sign-in pages.
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

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
/**
 * Features run one at a time (TIPS keeps one flow position per session), highest priority
 * first, first-come within a priority. Register/drop jump ahead of reads; background lookups
 * (a syllabus fetched only for a chip, the keep-alive) wait behind anything the student asked for.
 */
type Job = { priority: number; locale: Locale; fn: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void };
const jobs: Job[] = [];
let busy = false;
export function runFeature<T>(locale: Locale, fn: () => Promise<T>, priority = 0): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const at = jobs.findIndex(j => j.priority < priority);
    jobs.splice(at < 0 ? jobs.length : at, 0, { priority, locale, fn, resolve: resolve as (v: unknown) => void, reject });
    void pump();
  });
}
async function pump() {
  if (busy) return;
  const job = jobs.shift();
  if (!job) return;
  busy = true;
  wanted = job.locale;
  try { job.resolve(await job.fn()); } catch (e) { job.reject(e); }
  finally { busy = false; void pump(); }
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
    /** Unattended sign-in: running, what it waits on, and whether the Keychain account is set up. */
    signin: { busy: !!(reauthPromise || loginPromise), mfa, auto: autoLoginKnown() },
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
  context = await browser.newContext({ storageState: storage, locale: 'ja-JP', userAgent: DESKTOP_UA });
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
      // The SAML round trip can land on TIPS's root ("/", 403 Forbidden) because the SP drops the
      // return address; the Shibboleth session is set by then, so a second portal visit enters.
      // Stale TIPS cookies (JSESSIONID, Shibboleth) can send portal and ssologin round in a
      // redirect loop. Drop them; the Microsoft cookies alone sign back in silently.
      await ctx.clearCookies({ domain: 'tips.u-tokai.ac.jp' });
      worker = null; // its fetches used the old cookies
      for (let attempt = 1; ; attempt++) {
        const nav = await page.goto(PORTAL_URL).then(() => null, (e: Error) => e);
        if (nav && !/ERR_TOO_MANY_REDIRECTS|ERR_ABORTED/.test(nav.message)) throw nav;
        // Microsoft may show an account picker; choosing the known account types no password.
        const tile = page.locator('div[role="listitem"]', { hasText: '@tokai.ac.jp' }).first();
        void tile.waitFor({ timeout: 6_000 }).then(() => tile.click()).catch(() => {});
        const where = await Promise.race([
          page.waitForURL(isPortal, { timeout: 20_000 }).then(() => 'portal' as const),
          page.waitForURL(u => u.hostname === 'tips.u-tokai.ac.jp' && !isPortal(u) && !u.pathname.includes('ssologin'), { timeout: 20_000 }).then(() => 'tips' as const),
          waitForMicrosoftInput(page, 20_000),
        ].map(w => w.catch(() => 'timeout' as const)).map(w => w.then(r => (r === 'timeout' ? new Promise<never>(() => {}) : r)))
          .concat(new Promise<'timeout'>(r => setTimeout(() => r('timeout'), 21_000))));
        if (where === 'portal') break;
        // Microsoft wants the password or a second factor: fill it from the Keychain and relay
        // the second factor to the app, when the owner has set that up. Otherwise this ends the
        // session below, as before.
        if (where === 'microsoft') {
          if (!(await autoLoginConfigured())) throw new Error('Microsoft asked for sign-in');
          await driveMicrosoftLogin(page, mfaHooks);
          continue;
        }
        if (where === 'timeout' || attempt >= 3) throw new Error(`TIPS did not return to the portal (${where})`);
      }
      console.log('[tips] silent re-auth OK');
      await persist(); // Microsoft refreshed its cookies
    } catch (e) {
      const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 80);
      // Only a Microsoft page asking for credentials ends the session. A network blip must not
      // throw away the saved sign-in of a machine that runs unattended.
      const reason = (e as Error).message.split('\n')[0];
      if (!page.url().includes('login.microsoftonline.com') && !reason.startsWith('Microsoft') && !/password|approved|code|set up/.test(reason)) {
        throw new Error(`re-auth did not finish: ${reason}`);
      }
      await signOut();
      lastError = reason.startsWith('Microsoft asked') ? 'Microsoft asked for sign-in again' : reason;
      throw new SessionExpiredError(`silent re-auth failed (${text.replace(/\s+/g, ' ')})`);
    } finally {
      await page.close().catch(() => {});
      reauthPromise = null;
    }
  })();
  return reauthPromise;
}

export class SessionExpiredError extends Error { name = 'SessionExpiredError'; }

/** Resolves 'microsoft' once a Microsoft page is waiting for input (not just redirecting). */
async function waitForMicrosoftInput(page: Page, ms: number): Promise<'microsoft'> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await needsMicrosoftInput(page)) return 'microsoft';
    await page.waitForTimeout(700);
  }
  throw new Error('timeout');
}

/**
 * Signs in from scratch without a window: the Keychain account and password, the number to
 * match shown in the app. For when the bridge is signed out and the owner is away from the Mac.
 * index.ts checks the account against the owner ID afterwards, as for a window sign-in.
 */
export function autoSignIn(): Promise<void> {
  if (loginPromise) return loginPromise;
  if (reauthPromise) return reauthPromise;
  lastError = null;
  state = 'signing_in';
  loginPromise = (async () => {
    browser ??= await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ locale: 'ja-JP', userAgent: DESKTOP_UA });
    const page = await ctx.newPage();
    try {
      if (!(await autoLoginConfigured())) throw new Error('auto sign-in is not set up');
      await page.goto(PORTAL_URL, { timeout: 45_000 }).catch(() => {});
      await waitForMicrosoftInput(page, 20_000).catch(() => {});
      await driveMicrosoftLogin(page, mfaHooks);
      // The SAML return can land on TIPS's 403 root; the portal opens on the next visit.
      for (let i = 0; i < 3 && !isPortal(new URL(page.url())); i++) {
        await page.goto(PORTAL_URL, { timeout: 45_000 }).catch(() => {});
        await page.waitForTimeout(2500);
      }
      if (!isPortal(new URL(page.url()))) throw new Error('TIPS did not open after Microsoft sign-in');
      await context?.close().catch(() => {});
      context = ctx;
      worker = null;
      sessionLocale = null;
      accountId = null;
      state = 'signed_in';
      hubExpiresAt = Date.now() + DEFAULT_HUB_MINUTES * 60_000;
      armExpiry();
      await persist();
      console.log('[tips] signed in without a window (Keychain + relayed second factor)');
    } catch (e) {
      state = context ? 'signed_in' : 'signed_out';
      lastError = (e as Error).message.split('\n')[0];
      await ctx.close().catch(() => {});
      throw e;
    } finally {
      await page.close().catch(() => {});
      loginPromise = null;
    }
  })();
  return loginPromise;
}

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
