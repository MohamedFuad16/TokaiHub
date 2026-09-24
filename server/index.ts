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
  try { res.json(await auth.unlock(req.body?.response)); } catch (e) { authError(res, e); }
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

app.get('/tips-api/data/:feature', async (req, res) => {
  if (!ownerGuard(req, res)) return;
  try {
    const { handle } = await loadRoutes();
    res.json(await handle(req.params.feature, req.query as Record<string, string>));
  } catch (e) {
    if (e instanceof SessionExpiredError || (e as Error).name === 'SessionExpiredError') {
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
  const { fileId, folderId } = req.body ?? {};
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

async function main() {
  if (await session.restore().catch(() => false)) {
    if (auth.OWNER_ID && session.getAccountId() !== auth.OWNER_ID) await session.signOut();
  }
  const servers = [app.listen(PORT, '127.0.0.1', () => console.log(`[tips] bridge on http://127.0.0.1:${PORT}`))];
  if (auth.configured()) {
    servers.push(app.listen(PUBLIC_PORT, '127.0.0.1', () => console.log(`[tips] public listener on 127.0.0.1:${PUBLIC_PORT} for ${auth.APP_ORIGIN}, owner ${auth.OWNER_ID}`)));
  }
  const stop = async () => { await session.shutdown(); servers.forEach(s => s.close()); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
void main();
