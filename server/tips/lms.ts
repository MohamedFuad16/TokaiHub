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

// ── Assignment submission ───────────────────────────────────────────────────────────────────
// The submission form (view.php?action=editsubmission) keeps files in a per-form draft area;
// uploading there changes nothing the teacher sees. Only posting the form (submit()) hands it in.

interface SubmissionForm {
  cmid: number; action: string; fields: Record<string, string>; submitName: string; submitValue: string;
  draftItemId: string | null; ctxId: string; clientId: string; author: string; repoId: string;
  maxFiles: number; maxBytes: number; accepted: string[]; textField: string | null; text: string; at: number;
}
const forms = new Map<number, SubmissionForm>();

const unescapeJson = (s: string) => { try { return JSON.parse(`"${s}"`) as string; } catch { return s; } };

/** Opens the submission form and remembers what posting it needs (30 minutes). */
export async function openSubmission(cmid: number): Promise<SubmissionForm> {
  const { html, url } = await lmsGet(`/mod/assign/view.php?id=${cmid}&action=editsubmission`);
  const form = /<form[^>]*class="mform"[^>]*>([\s\S]*?)<\/form>/.exec(html);
  if (!form) throw Object.assign(new Error('this assignment is not open for submission'), { status: 409 });
  const action = /<form[^>]*action="([^"]+)"[^>]*class="mform"/.exec(html)?.[1] ?? '/mod/assign/view.php';
  const fields: Record<string, string> = {};
  for (const m of form[1].matchAll(/<input([^>]*)type="hidden"([^>]*)>/g)) {
    const attrs = m[1] + m[2];
    const name = /name="([^"]+)"/.exec(attrs)?.[1];
    if (name) fields[name] = (/value="([^"]*)"/.exec(attrs)?.[1] ?? '').replace(/&amp;/g, '&');
  }
  const submit = /<input[^>]*type="submit"[^>]*name="submitbutton"[^>]*value="([^"]*)"/.exec(form[1]) ?? /<input[^>]*name="submitbutton"[^>]*value="([^"]*)"/.exec(form[1]);
  const opt = (k: string) => new RegExp(`"${k}":"?([^",}]*)"?`).exec(html)?.[1] ?? '';
  const textarea = /<textarea[^>]*name="(onlinetext_editor\[text\])"[^>]*>([\s\S]*?)<\/textarea>/.exec(form[1]);
  const f: SubmissionForm = {
    cmid, action: new URL(action.replace(/&amp;/g, '&'), url).pathname, fields,
    submitName: 'submitbutton', submitValue: submit?.[1] ?? '',
    draftItemId: fields.files_filemanager ?? null,
    ctxId: /"context":\{"id":(\d+)/.exec(html)?.[1] ?? '', clientId: opt('client_id'), author: unescapeJson(opt('author')),
    repoId: /"(\d+)":\{"id":"\d+","name":"[^"]*","type":"upload"/.exec(html)?.[1] ?? '',
    maxFiles: Number(opt('maxfiles')) || 1, maxBytes: Number(opt('maxbytes')) || 0,
    accepted: [...(/"accepted_types":\[([^\]]*)\]/.exec(html)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(t => t !== '*'),
    textField: textarea?.[1] ?? null, text: textarea ? textarea[2].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : '',
    at: Date.now(),
  };
  // The text box's draft area and format ride along as hidden fields already.
  forms.set(cmid, f);
  return f;
}

async function form(cmid: number) {
  const f = forms.get(cmid);
  return f && Date.now() - f.at < 30 * 60_000 ? f : openSubmission(cmid);
}

/** POSTs a form body inside the LMS page (urlencoded or multipart from base64 parts). */
async function post(path: string, body: { fields: Record<string, string>; file?: { name: string; b64: string; field: string } }) {
  const page = await lmsPage();
  return page.evaluate(async ({ path, body }) => {
    let payload: BodyInit;
    if (body.file) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(body.fields)) fd.append(k, v);
      const bin = atob(body.file.b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      fd.append(body.file.field, new Blob([bytes]), body.file.name);
      payload = fd;
    } else payload = new URLSearchParams(body.fields);
    const res = await fetch(path, { method: 'POST', credentials: 'include', body: payload });
    return { status: res.status, url: res.url, text: await res.text() };
  }, { path, body });
}

/** Files in the form's draft area (what will be handed in). */
export async function draftFiles(cmid: number) {
  const f = await form(cmid);
  if (!f.draftItemId) return [];
  const r = await post('/repository/draftfiles_ajax.php?action=list', { fields: { sesskey, client_id: f.clientId, filepath: '/', itemid: f.draftItemId } });
  const list = (JSON.parse(r.text).list ?? []) as { filename: string; size?: number; filesize?: string }[];
  return list.map(x => ({ name: x.filename, size: x.size ?? null }));
}

/** Adds a file to the draft area. Nothing is submitted. */
export async function uploadDraft(cmid: number, name: string, bytes: Buffer) {
  const f = await form(cmid);
  if (!f.draftItemId || !f.repoId) throw Object.assign(new Error('this assignment takes no files'), { status: 409 });
  const ext = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '';
  if (f.accepted.length && !f.accepted.includes(ext)) throw Object.assign(new Error(`this assignment accepts ${f.accepted.join(', ')}`), { status: 400 });
  if (f.maxBytes && bytes.length > f.maxBytes) throw Object.assign(new Error('the file is larger than the assignment allows'), { status: 400 });
  const r = await post('/repository/repository_ajax.php?action=upload', {
    fields: {
      sesskey, repo_id: f.repoId, itemid: f.draftItemId, author: f.author, savepath: '/', title: name,
      ctx_id: f.ctxId, client_id: f.clientId, env: 'filemanager', license: 'unknown', overwrite: '1',
      maxbytes: String(f.maxBytes || -1), areamaxbytes: '-1',
    },
    file: { name, b64: bytes.toString('base64'), field: 'repo_upload_file' },
  });
  const out = JSON.parse(r.text);
  if (out.error) throw Object.assign(new Error(`LMS: ${out.error}`), { status: 400 });
  return draftFiles(cmid);
}

/** Removes a file from the draft area. */
export async function removeDraft(cmid: number, name: string) {
  const f = await form(cmid);
  if (!f.draftItemId) return [];
  await post('/repository/draftfiles_ajax.php?action=delete', { fields: { sesskey, client_id: f.clientId, filepath: '/', itemid: f.draftItemId, filename: name } });
  return draftFiles(cmid);
}

/**
 * Hands the submission in: posts the form with the draft files (and text, if the assignment has a
 * text box). Called only after the student confirms in the app.
 */
export async function submit(cmid: number, text?: string) {
  const f = await form(cmid);
  const fields = { ...f.fields, [f.submitName]: f.submitValue };
  if (f.textField && typeof text === 'string') fields[f.textField] = text;
  const r = await post(f.action, { fields });
  forms.delete(cmid);
  if (r.status >= 400) throw new Error(`LMS ${r.status} when submitting`);
  // A form shown again means Moodle refused it; say why if it says.
  const error = /class="(?:error|alert alert-danger)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/.exec(r.text)?.[1]?.replace(/<[^>]+>/g, '').trim();
  if (/action=editsubmission|name="_qf__mod_assign_submission_form"/.test(r.text) && error) throw Object.assign(new Error(error), { status: 400 });
}
