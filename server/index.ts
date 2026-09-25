/**
 * TokaiHub TIPS bridge.
 *
 * Local listener, 127.0.0.1:8791. Trusted: only this Mac reaches it. It opens the Microsoft
 * sign-in window and issues passkey setup codes. Dev: `npm run bridge`, and Vite proxies
 * /tips-api to it. Hosted: it also serves build/.
 *
 * Public listener, 127.0.0.1:8792. Only started when HUB_OWNER_ID and HUB_APP_ORIGIN are set.
 * The Cloudflare tunnel forwards api.<domain> here. Every data request needs the owner's device
 * token (see auth.ts), and the TIPS session on this Mac must belong to HUB_OWNER_ID.
 */
import path from 'node:path';
import fs from 'node:fs';
import express, { type Request, type Response, type NextFunction } from 'express';
import * as session from './tips/session';
import { SessionExpiredError } from './tips/session';
import * as cache from './tips/cache';
import * as auth from './auth';
import { autoLoginConfigured } from './tips/keychain';
import * as push from './tips/push';

const PORT = Number(process.env.TIPS_BRIDGE_PORT ?? 8791);
const PUBLIC_PORT = Number(process.env.TIPS_PUBLIC_PORT ?? 8792);
const DEV = process.env.NODE_ENV !== 'production';
const app = express();
app.use(express.json({ limit: '64kb' }));

const isPublic = (req: Request) => req.socket.localPort === PUBLIC_PORT;
const clientIp = (req: Request) => String(req.headers['cf-connecting-ip'] ?? req.socket.remoteAddress ?? '');
const ownerSignedIn = () => session.status().state === 'signed_in' && (!auth.OWNER_ID || session.getAccountId() === auth.OWNER_ID);

// ── Public listener gate ───────────────────────────────────────────────────────────────────
const PUBLIC_OPEN = new Set(['/tips-api/health', '/tips-api/auth/options', '/tips-api/auth/unlock', '/tips-api/auth/register/options', '/tips-api/auth/register']);
const LOCAL_ONLY = [/^\/tips-api\/signin/, /^\/tips-api\/dev\//, /^\/tips-api\/auth\/setup-code/, /^\/tips-api\/extend/];

app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isPublic(req)) return next();
  // Only the hosted app may call from a browser.
  if (req.headers.origin === auth.APP_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', auth.APP_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!req.path.startsWith('/tips-api/')) return res.status(404).end();
  if (LOCAL_ONLY.some(r => r.test(req.path))) return res.status(403).json({ error: 'only available on the Mac' });
  if (PUBLIC_OPEN.has(req.path)) {
    if (auth.rateLimited(clientIp(req))) return res.status(429).json({ error: 'too many attempts, wait a minute' });
    return next();
  }
  if (req.path === '/tips-api/file' && typeof req.query.ticket === 'string') return next(); // ticket is the credential
  if (!auth.checkToken(req.headers.authorization)) return res.status(401).json({ error: 'locked' });
  next();
});

// ── Session ────────────────────────────────────────────────────────────────────────────────
app.get('/tips-api/health', (_req, res) => res.json({ ok: true }));

app.get('/tips-api/status', (req, res) => {
  const s = session.status();
  // The phone only needs to know whether the owner's TIPS session is usable.
  res.json(isPublic(req) ? { ...s, state: ownerSignedIn() ? 'signed_in' : 'signed_out' } : { ...s, accountId: session.getAccountId(), ownerId: auth.OWNER_ID || null, devices: auth.deviceCount() });
});

/** Confirms the signed-in TIPS account is the owner's; signs out and wipes the cache if not. */
async function verifyOwner() {
  const { handle } = await loadRoutes();
  const profile = await handle('profile', { refresh: '1' }) as { data: { studentId?: string } };
  const id = String(profile.data.studentId ?? '').trim().toUpperCase();
  if (auth.OWNER_ID && id !== auth.OWNER_ID) {
    await session.signOut();
    cache.clear();
    throw Object.assign(new Error(`This TokaiHub only accepts ${auth.OWNER_ID}`), { status: 403 });
  }
  await session.setAccountId(id);
}

app.post('/tips-api/signin', async (_req, res) => {
  try {
    await session.signIn();
    await verifyOwner();
    res.json(session.status());
  } catch (e) {
    // TIPS refusing the connection (outage, maintenance) is not a failed sign-in; say so.
    const down = /net::ERR_(CONNECTION|NAME|TIMED|SSL|ADDRESS)|ECONNRESET|ETIMEDOUT/.test((e as Error).message);
    if (down) return res.status(503).json({ ...session.status(), error: 'tips_unreachable' });
    res.status((e as any).status ?? 401).json({ ...session.status(), error: (e as Error).message.split('\n')[0] });
  }
});

app.post('/tips-api/signout', async (req, res) => {
  // From the phone, "sign out" locks that device. Signing the Mac out of TIPS would leave the
  // owner unable to get back in until they are at the Mac.
  if (isPublic(req)) { auth.revokeToken(req.headers.authorization); return res.json({ ...session.status(), state: 'signed_out' }); }
  await session.signOut();
  if (req.body?.clearCache) cache.clear();
  res.json(session.status());
});

app.post('/tips-api/extend', (req, res) => {
  try { res.json(session.extend(Number(req.body?.minutes ?? 60))); }
  catch (e) { res.status(401).json({ error: (e as Error).message }); }
});

// ── Owner devices (passkeys) ───────────────────────────────────────────────────────────────
const authError = (res: Response, e: unknown) => res.status((e as any).status ?? 400).json({ error: (e as Error).message.split('\n')[0] });

app.post('/tips-api/auth/setup-code', (_req, res) => {
  if (!auth.configured()) return res.status(409).json({ error: 'set HUB_OWNER_ID and HUB_APP_ORIGIN first' });
  if (!ownerSignedIn() || !session.getAccountId()) return res.status(409).json({ error: `sign in to TIPS as ${auth.OWNER_ID} on this Mac first` });
  res.json(auth.createSetupCode());
});
app.post('/tips-api/auth/register/options', async (req, res) => {
  try { res.json(await auth.registrationOptions(req.body?.code)); } catch (e) { authError(res, e); }
});
app.post('/tips-api/auth/register', async (req, res) => {
  try { res.json(await auth.registerDevice(req.body?.code, req.body?.response, req.body?.label)); } catch (e) { authError(res, e); }
});
app.post('/tips-api/auth/options', async (_req, res) => {
  try { res.json(await auth.authenticationOptions()); } catch (e) { authError(res, e); }
});
app.post('/tips-api/auth/unlock', async (req, res) => {
  try { res.json(await auth.unlock(req.body?.response, req.body?.label)); } catch (e) { authError(res, e); }
});

// Listed from any unlocked device (and the Mac). Removing the device you are on locks it.
app.get('/tips-api/auth/devices', (req, res) => res.json(auth.listDevices(req.headers.authorization)));
app.post('/tips-api/auth/devices/remove', (req, res) => {
  try { auth.removeDevice(req.body?.id); res.json(auth.listDevices(req.headers.authorization)); } catch (e) { authError(res, e); }
});
app.post('/tips-api/auth/sessions/remove', (req, res) => {
  try { auth.removeSession(req.body?.id); res.json(auth.listDevices(req.headers.authorization)); } catch (e) { authError(res, e); }
});

// ── Course recommender (built in the background from TIPS, the handbook and Jev) ──────────
app.get('/tips-api/recommend', async (req, res) => {
  if (!ownerGuard(req, res)) return;
  const lang = req.query.lang === 'en' ? 'en' : 'jp';
  const { ensureBuilt, recommendStatus } = await import('./tips/recommend');
  // Nothing to read while TIPS is signed out; keep any saved result and say why.
  if (session.status().state !== 'signed_in') return res.json({ ...recommendStatus(lang), error: 'signed_out' });
  ensureBuilt(lang, req.query.refresh === '1');
  res.json(recommendStatus(lang));
});

// ── Push notifications (the installed app subscribes; the bridge sends, app open or not) ───
app.get('/tips-api/push/key', (_req, res) => res.json({ publicKey: push.vapidPublicKey() }));
app.post('/tips-api/push/subscribe', (req, res) => {
  try { push.subscribe(req.body?.subscription, String(req.body?.label ?? 'device'), req.body?.prefs ?? {}); res.json({ prefs: push.prefsOf(req.body.subscription.endpoint) }); }
  catch (e) { res.status((e as any).status ?? 400).json({ error: (e as Error).message }); }
});
app.post('/tips-api/push/prefs', (req, res) => res.json({ prefs: push.prefsOf(String(req.body?.endpoint ?? '')) }));
app.post('/tips-api/push/unsubscribe', (req, res) => { push.unsubscribe(String(req.body?.endpoint ?? '')); res.json({ ok: true }); });
app.post('/tips-api/push/test', async (req, res) => {
  const sent = await push.notify('test', lang => ({
    title: 'TokaiHub', body: lang === 'en' ? 'Notifications are on. Class reminders and new bulletins will show here.' : '通知がオンになりました。授業のリマインダーや新しい掲示がここに届きます。',
    navigate: '/settings', tag: 'test',
  }), { endpoint: String(req.body?.endpoint ?? '') });
  res.status(sent ? 200 : 404).json({ sent });
});

// ── Unattended sign-in (Keychain account, number to match shown in the app) ────────────────
/** Starts a sign-in without a window; the app follows it through /status (signin.mfa, busy). */
app.post('/tips-api/reauth', async (_req, res) => {
  if (ownerSignedIn()) return res.json(session.status());
  if (!(await autoLoginConfigured())) return res.status(409).json({ error: 'auto sign-in is not set up on the Mac' });
  session.autoSignIn()
    .then(() => verifyOwner())
    .catch(e => console.error('[tips] auto sign-in failed:', (e as Error).message.split('\n')[0]));
  res.status(202).json(session.status());
});

// ── TIPS data ──────────────────────────────────────────────────────────────────────────────
// Feature routes live in routes.ts and are re-imported on every request in dev, so parser
// edits apply without restarting the bridge (a restart would drop the in-memory session).
async function loadRoutes() {
  return DEV ? import(`./tips/routes.ts?t=${Date.now()}`) : import('./tips/routes');
}

/** On the public listener the TIPS session must be the owner's, whatever the token says. */
function ownerGuard(req: Request, res: Response) {
  if (isPublic(req) && !ownerSignedIn()) { res.status(401).json({ error: 'signed_out' }); return false; }
  return true;
}

/**
 * A read that runs into an unattended Microsoft sign-in would wait for the owner's approval,
 * longer than Cloudflare holds a request (100 s). Answer "approval pending" as soon as a second
 * factor is waiting, so the app can show it; the sign-in and the read carry on in the background.
 */
function unlessMfaPending<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const timer = setInterval(() => {
      if (!done && session.status().signin.mfa) {
        done = true; clearInterval(timer);
        reject(Object.assign(new Error('mfa_pending'), { status: 503 }));
      }
    }, 500);
    work.then(v => { if (!done) { done = true; clearInterval(timer); resolve(v); } },
      e => { if (!done) { done = true; clearInterval(timer); reject(e); } });
  });
}

app.get('/tips-api/data/:feature', async (req, res) => {
  if (!ownerGuard(req, res)) return;
  try {
    const { handle } = await loadRoutes();
    res.json(await unlessMfaPending(handle(req.params.feature, req.query as Record<string, string>)));
  } catch (e) {
    if ((e as Error).message === 'mfa_pending') {
      res.status(503).json({ error: 'mfa_pending', mfa: session.status().signin.mfa });
    } else if (e instanceof SessionExpiredError || (e as Error).name === 'SessionExpiredError') {
      res.status(401).json({ error: 'signed_out', detail: (e as Error).message });
    } else if ((e as any).status === 404) {
      res.status(404).json({ error: (e as Error).message });
    } else {
      console.error('[tips]', req.params.feature, (e as Error).message.split('\n')[0]);
      res.status(502).json({ error: (e as Error).message });
    }
  }
});

app.post('/tips-api/action/:action', async (req, res) => {
  if (!ownerGuard(req, res)) return;
  try {
    const { act } = await loadRoutes();
    res.json(await act(req.params.action, req.body ?? {}));
  } catch (e) {
    const status = (e as any).status ?? ((e as Error).name === 'SessionExpiredError' ? 401 : 502);
    res.status(status).json({ error: (e as Error).message.split('\n')[0] });
  }
});

/** A one-minute, single-use link for a cabinet file, so the phone can open it in a new tab. */
app.post('/tips-api/file-ticket', (req, res) => {
  const b = req.body ?? {};
  const str = (k: string) => String(b[k] ?? '');
  // Syllabus and bulletin attachments are addressed by their page; routes.file() checks the
  // same patterns again before anything reaches TIPS.
  if (b.kind === 'syllabus') {
    if (!/^\d{4}$/.test(str('year')) || !/^[A-Za-z0-9]{3,12}$/.test(str('code')) || !/^\d{1,4}$/.test(str('column')) || !/^\d{1,3}$/.test(str('renban'))) return res.status(400).json({ error: 'bad file id' });
    return res.json({ ticket: auth.fileTicket({ kind: 'syllabus', year: str('year'), code: str('code'), column: str('column'), renban: str('renban'), locale: str('locale') === 'en_US' ? 'en_US' : 'ja_JP' }) });
  }
  if (b.kind === 'bulletin') {
    if (!/^\d+-\w+-\d+$/.test(str('id')) || !/^\d{1,3}$/.test(str('index'))) return res.status(400).json({ error: 'bad file id' });
    return res.json({ ticket: auth.fileTicket({ kind: 'bulletin', id: str('id'), index: str('index') }) });
  }
  const { fileId, folderId } = b;
  if (!/^\d+$/.test(String(fileId)) || !/^\d+$/.test(String(folderId))) return res.status(400).json({ error: 'bad file id' });
  res.json({ ticket: auth.fileTicket({ fileId: String(fileId), folderId: String(folderId) }) });
});

app.get('/tips-api/file', async (req, res) => {
  const params = typeof req.query.ticket === 'string' ? auth.redeemTicket(req.query.ticket) : req.query as Record<string, string>;
  if (!params) return res.status(403).json({ error: 'link expired, open the file again' });
  if (!ownerGuard(req, res)) return;
  try {
    const { file } = await loadRoutes();
    const f = await file(params);
    res.setHeader('Content-Type', f.type);
    if (f.disposition) res.setHeader('Content-Disposition', f.disposition);
    res.setHeader('Cache-Control', 'no-store');
    res.end(f.bytes);
  } catch (e) {
    const status = (e as any).status ?? ((e as Error).name === 'SessionExpiredError' ? 401 : 502);
    res.status(status).json({ error: (e as Error).message.split('\n')[0] });
  }
});

app.get('/tips-api/dev/dump', async (req, res) => {
  if (!DEV) return res.status(404).end();
  try {
    const { dump } = await loadRoutes();
    res.json(await dump(String(req.query.flow ?? ''), req.query as Record<string, string>));
  } catch (e) { res.status(502).json({ error: (e as Error).message.split('\n')[0] }); }
});

// Hosted mode, local listener: serve the built PWA. Only Vite's hashed files under assets/ are
// immutable; everything else (index.html, sw.js, manifest) revalidates.
const BUILD_DIR = path.resolve(import.meta.dirname, '../build');
if (!DEV && fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR, {
    index: false,
    setHeaders(res, file) {
      const hashed = path.relative(BUILD_DIR, file).startsWith(`assets${path.sep}`);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  app.get(/^(?!\/tips-api\/).*/, (_req, res) => res.setHeader('Cache-Control', 'no-cache').sendFile(path.join(BUILD_DIR, 'index.html')));
}

// Never let one failed request take the session down with the process.
process.on('unhandledRejection', e => console.error('[tips] unhandled:', (e as Error)?.message?.split('\n')[0]));

/**
 * Hosted mode keeps the TIPS session warm: TIPS idles out after 30 minutes, and the first
 * request after that pays a Microsoft round trip. One portal hit every 20 minutes (one request,
 * the page a signed-in browser tab would reload) avoids it; an expired session is re-entered by
 * the same request.
 */
const KEEPALIVE_MS = 20 * 60_000;
function keepAlive() {
  if (process.env.TIPS_PERSIST !== '1') return;
  setInterval(async () => {
    if (session.status().state !== 'signed_in') return;
    try {
      const client = await import('./tips/client');
      await session.runFeature(session.getSessionLocale() ?? 'ja_JP', () => client.get('/campusweb/portal.do?page=main'), -2);
    } catch (e) {
      console.error('[tips] keep-alive failed:', (e as Error).message.split('\n')[0]);
    }
  }, KEEPALIVE_MS).unref();
}

async function main() {
  void autoLoginConfigured(); // so /status can say whether unattended sign-in is set up
  if (await session.restore().catch(() => false)) {
    if (auth.OWNER_ID && session.getAccountId() !== auth.OWNER_ID) await session.signOut();
  }
  keepAlive();
  // Class reminders, schedule changes, new bulletins: checked every minute, TIPS read rarely.
  setInterval(async () => {
    try {
      const { handle } = await loadRoutes();
      await push.tick((f, q) => handle(f, q) as Promise<{ data: any }>, ownerSignedIn());
    } catch (e) { console.error('[push] tick:', (e as Error).message.split('\n')[0]); }
  }, 60_000).unref();
  const servers = [app.listen(PORT, '127.0.0.1', () => console.log(`[tips] bridge on http://127.0.0.1:${PORT}`))];
  if (auth.configured()) {
    servers.push(app.listen(PUBLIC_PORT, '127.0.0.1', () => console.log(`[tips] public listener on 127.0.0.1:${PUBLIC_PORT} for ${auth.APP_ORIGIN}, owner ${auth.OWNER_ID}`)));
  }
  const stop = async () => { await session.shutdown(); servers.forEach(s => s.close()); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
void main();
