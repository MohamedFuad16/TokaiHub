/**
 * The university's LMS (Open LMS, a Moodle site) through the same signed-in browser as TIPS.
 * The site has the Moodle mobile web service turned off, so the bridge uses what the LMS's own
 * pages use: a page parked on the LMS origin, the session cookie it gets from the Microsoft SAML
 * sign-in, and Moodle's AJAX endpoint (/lib/ajax/service.php) with the page's sesskey.
 */
import type { Page } from 'playwright';
import { microsoftSignIn, requireContext, SessionExpiredError } from './session';
import { needsMicrosoftInput } from './msLogin';

export const LMS_ORIGIN = 'https://tlms.tsc.u-tokai.ac.jp';

let worker: Page | null = null;
let sesskey = '';

let opening: Promise<Page> | null = null;
/** A page on the LMS origin with a live Moodle session; signs in through SAML when needed. */
function lmsPage(): Promise<Page> {
  if (!opening) opening = openLms().finally(() => { opening = null; });
  return opening;
}
async function openLms(): Promise<Page> {
  const ctx = requireContext();
  if (worker && !worker.isClosed() && worker.context() === ctx && sesskey) return worker;
  worker = worker && !worker.isClosed() && worker.context() === ctx ? worker : await ctx.newPage();
  await worker.goto(`${LMS_ORIGIN}/my/`, { timeout: 45_000, waitUntil: 'domcontentloaded' });
  await worker.waitForURL(u => u.origin === LMS_ORIGIN, { timeout: 30_000 }).catch(() => {});
  if (new URL(worker.url()).origin !== LMS_ORIGIN) {
    // Microsoft wants the password (its sign-in period ran out): the same unattended sign-in as
    // TIPS, with the number sent to the app.
    sesskey = '';
    if (await needsMicrosoftInput(worker)) await microsoftSignIn(worker);
    await worker.waitForURL(u => u.origin === LMS_ORIGIN, { timeout: 30_000 }).catch(() => {});
    if (new URL(worker.url()).origin !== LMS_ORIGIN) throw new SessionExpiredError('LMS sign-in did not finish');
  }
  sesskey = await worker.evaluate(() => (window as unknown as { M?: { cfg?: { sesskey?: string } } }).M?.cfg?.sesskey ?? '');
  if (!sesskey) throw new Error('LMS page has no sesskey');
  return worker;
}

/** Forget the session (after a "require login" answer), so the next call signs in again. */
function reset() { sesskey = ''; }

export interface MoodleError { errorcode?: string; message?: string }

/** Calls one Moodle AJAX function as the signed-in student. */
export async function ajax<T>(methodname: string, args: Record<string, unknown>, retried = false): Promise<T> {
  const page = await lmsPage();
  const r = await page.evaluate(async ({ methodname, args, sesskey }) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 30_000);
    try {
      const res = await fetch(`/lib/ajax/service.php?sesskey=${sesskey}&info=${methodname}`, {
        method: 'POST', credentials: 'include', signal: abort.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ index: 0, methodname, args }]),
      });
      return { status: res.status, body: await res.text() };
    } catch (e) { return { status: 0, body: String(e) }; } finally { clearTimeout(timer); }
  }, { methodname, args, sesskey });
  if (r.status !== 200) throw new Error(`LMS ${methodname}: HTTP ${r.status} ${r.body.slice(0, 120)}`);
  const parsed = JSON.parse(r.body);
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (first?.error || parsed?.error) {
    const ex: MoodleError = first?.exception ?? parsed;
    // The session ended (timeout or Microsoft): sign in again once.
    if (!retried && /requirelogin|invalidsesskey|servicerequireslogin/.test(ex.errorcode ?? '')) { reset(); return ajax<T>(methodname, args, true); }
    throw Object.assign(new Error(`LMS ${methodname}: ${ex.errorcode ?? ''} ${ex.message ?? ''}`.trim()), { code: ex.errorcode });
  }
  return first.data as T;
}

/** An LMS page's HTML, fetched inside the LMS page so its cookies apply. */
export async function lmsGet(url: string): Promise<{ url: string; html: string }> {
  const page = await lmsPage();
  const r = await page.evaluate(async u => {
    const res = await fetch(u, { credentials: 'include' });
    return { url: res.url, status: res.status, html: await res.text() };
  }, new URL(url, LMS_ORIGIN).toString());
  if (new URL(r.url).origin !== LMS_ORIGIN || /login\/index\.php/.test(r.url)) { reset(); throw new SessionExpiredError('LMS session ended'); }
  if (r.status >= 400) throw new Error(`LMS ${r.status} for ${new URL(r.url).pathname}`);
  return { url: r.url, html: r.html };
}

/** A file from the LMS (pluginfile.php, or a resource page that leads to one), as bytes. */
export async function lmsBinary(url: string): Promise<{ bytes: Buffer; type: string; name: string | null }> {
  const target = new URL(url, LMS_ORIGIN);
  if (target.origin !== LMS_ORIGIN) throw Object.assign(new Error('not an LMS address'), { status: 400 });
  const page = await lmsPage();
  const grab = (u: string) => page.evaluate(async u => {
    const res = await fetch(u, { credentials: 'include' });
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { url: res.url, status: res.status, type: res.headers.get('content-type') ?? '', disposition: res.headers.get('content-disposition') ?? '', b64: btoa(bin) };
  }, u);
  let r = await grab(target.toString());
  // A resource page that shows a link instead of redirecting: follow its first file link.
  if (/text\/html/.test(r.type) && !/pluginfile\.php/.test(r.url)) {
    const html = Buffer.from(r.b64, 'base64').toString('utf8');
    const href = /href="([^"]*\/pluginfile\.php\/[^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, '&');
    if (!href) throw Object.assign(new Error('no file on that page'), { status: 404 });
    r = await grab(href);
  }
  if (r.status >= 400) throw Object.assign(new Error(`LMS ${r.status} for the file`), { status: r.status === 404 ? 404 : 502 });
  // The file's address carries its name percent-encoded; Moodle's header sends raw UTF-8, which
  // fetch reads as Latin-1, so the header is only a fallback (re-decoded).
  const fromPath = new URL(r.url).pathname.split('/').pop() ?? '';
  const fromHeader = /filename="?([^";]+)"?/i.exec(r.disposition)?.[1] ?? '';
  let name: string;
  try { name = decodeURIComponent(fromPath); } catch { name = ''; }
  if (!name && fromHeader) name = Buffer.from(fromHeader, 'latin1').toString('utf8');
  return { bytes: Buffer.from(r.b64, 'base64'), type: r.type || 'application/octet-stream', name: name || null };
}
