/**
 * Low-level TIPS HTTP client. TIPS (NS Solutions CampusSquare) is server-rendered Spring Web
 * Flow: GET ?_flowId=X-flow redirects to ?_flowExecutionKey=_c.._k.., and every button POSTs the
 * current key plus an _eventId. Requests run one at a time, because starting a flow while
 * another is loading made TIPS hang during manual testing.
 */
import * as cheerio from 'cheerio';
import { TIPS_ORIGIN, workerPage, reauthenticate, SessionExpiredError, getSessionLocale, setSessionLocale, getWantedLocale } from './session';

export interface Page {
  url: string;
  html: string;
  $: cheerio.CheerioAPI;
  ms: number;
}

let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

type Req = { method: 'GET' } | { method: 'POST'; form: Record<string, string | string[]> };

async function once(url: string, req: Req): Promise<Page> {
  const page = await workerPage();
  const t0 = Date.now();
  const r = await page.evaluate(async ({ url, method, body }) => {
    try {
      const res = await fetch(url, {
        method, credentials: 'include', redirect: 'follow',
        headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
        body: body ?? undefined,
      });
      const buf = await res.arrayBuffer();
      const head = new TextDecoder('latin1').decode(buf.slice(0, 2048));
      const charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1]
        ?? /charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
      let html: string;
      try { html = new TextDecoder(charset).decode(buf); } catch { html = new TextDecoder().decode(buf); }
      return { ok: true as const, status: res.status, url: res.url, html };
    } catch (e) {
      // A redirect to login.microsoftonline.com is cross-origin, so fetch rejects with TypeError.
      return { ok: false as const, error: String(e) };
    }
  }, { url, method: req.method, body: req.method === 'POST' ? encodeForm(req.form) : null });
  if (!r.ok) throw new SessionExpiredError(`request blocked (${r.error}); likely signed out`);
  const finalUrl = new URL(r.url);
  if (looksSignedOut(finalUrl, r.html)) throw new SessionExpiredError('tips session expired');
  if (r.status >= 400) throw new Error(`TIPS ${r.status} for ${finalUrl.pathname}`);
  return { url: r.url, html: r.html, $: cheerio.load(r.html), ms: Date.now() - t0 };
}

function looksSignedOut(url: URL, html: string) {
  return url.hostname.endsWith('microsoftonline.com') || url.pathname.includes('ssologin') ||
    (url.hostname === 'tips.u-tokai.ac.jp' && /_display=login/.test(url.search));
}

function encodeForm(form: Record<string, string | string[]>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) for (const one of Array.isArray(v) ? v : [v]) p.append(k, one);
  return p.toString();
}

async function applyLocale() {
  const want = getWantedLocale();
  if (getSessionLocale() === want) return;
  await once(`${TIPS_ORIGIN}/campusweb/portal.do?page=main&locale=${want}`, { method: 'GET' });
  setSessionLocale(want);
}

/** One request, with a single silent re-auth + retry when TIPS has idled out. */
function request(url: string, req: Req): Promise<Page> {
  return serial(async () => {
    try {
      await applyLocale();
      return await once(url, req);
    } catch (e) {
      if (!(e instanceof SessionExpiredError)) throw e;
      await reauthenticate();
      setSessionLocale(null);
      await applyLocale();
      return once(url, req);
    }
  });
}



export const get = (pathOrUrl: string) => request(new URL(pathOrUrl, TIPS_ORIGIN).toString(), { method: 'GET' });

export const startFlow = (flowId: string) => get(`/campusweb/campussquare.do?_flowId=${flowId}`);

/**
 * Serializes a form the way a browser would (inputs, checked boxes, selected options), applies
 * overrides, and submits it. Use `null` in overrides to drop a field.
 */
export function submitForm(page: Page, formSelector: string, overrides: Record<string, string | string[] | null> = {}): Promise<Page> {
  const $ = page.$;
  const form = $(formSelector).first();
  if (!form.length) throw new Error(`form not found: ${formSelector}`);
  const fields: Record<string, string | string[]> = {};
  const add = (k: string, v: string) => {
    const cur = fields[k];
    fields[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
  };
  form.find('input, select, textarea').each((_, el) => {
    const e = $(el);
    const name = e.attr('name');
    if (!name || e.is('[disabled]')) return;
    const type = (e.attr('type') ?? '').toLowerCase();
    if (['submit', 'button', 'image', 'reset', 'file'].includes(type)) return;
    if ((type === 'checkbox' || type === 'radio') && !e.is('[checked]')) return;
    if (el.tagName === 'select') {
      const sel = e.find('option[selected]').first();
      add(name, (sel.length ? sel : e.find('option').first()).attr('value') ?? '');
    } else {
      add(name, e.attr('value') ?? e.text() ?? '');
    }
  });
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) delete fields[k]; else fields[k] = v;
  }
  const action = new URL(form.attr('action') || page.url, page.url).toString();
  const method = (form.attr('method') ?? 'get').toLowerCase();
  if (method === 'get') {
    const u = new URL(action);
    u.search = encodeForm(fields);
    return request(u.toString(), { method: 'GET' });
  }
  return request(action, { method: 'POST', form: fields });
}

/** Binary download (cabinet files) via the browser: returns bytes, type and file name. */
export function getBinary(pathOrUrl: string) {
  const url = new URL(pathOrUrl, TIPS_ORIGIN).toString();
  return serial(async () => {
    const page = await workerPage();
    const r = await page.evaluate(async (u: string) => {
      const res = await fetch(u, { credentials: 'include' });
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { status: res.status, url: res.url, type: res.headers.get('content-type') ?? 'application/octet-stream', disposition: res.headers.get('content-disposition') ?? '', b64: btoa(bin) };
    }, url);
    if (new URL(r.url).hostname.endsWith('microsoftonline.com')) throw new SessionExpiredError('tips session expired');
    if (r.status >= 400) throw new Error(`TIPS ${r.status} for file`);
    return { type: r.type, disposition: r.disposition, bytes: Buffer.from(r.b64, 'base64') };
  });
}

/** Current flow execution key of a page (every form on a flow page carries it). */
export function flowKey(page: Page): string {
  const k = page.$('input[name="_flowExecutionKey"]').filter((_, e) => !!page.$(e).attr('value')).first().attr('value')
    ?? /_flowExecutionKey=([^&"']+)/.exec(page.url)?.[1];
  if (!k) throw new Error('no flow key on page');
  return k;
}

/** Fires a flow event by GET, the way TIPS's own javascript links do. */
export function event(page: Page, eventId: string, params: Record<string, string> = {}): Promise<Page> {
  const q = new URLSearchParams({ _flowExecutionKey: flowKey(page), _eventId: eventId, ...params });
  return get(`/campusweb/campussquare.do?${q}`);
}

/** Normalizes whitespace in cell text. */
export const txt = (s: string | undefined | null) => (s ?? '').replace(/[\s　]+/g, ' ').trim();
