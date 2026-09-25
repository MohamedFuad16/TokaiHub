/**
 * Owner lock for the public listener. The Hub serves exactly one person, HUB_OWNER_ID.
 *
 * A device proves it belongs to the owner with a passkey (Face ID / Touch ID). Passkeys are
 * enrolled with a one-time setup code that only this Mac can create, and only while the TIPS
 * session here is the owner's. A successful passkey check returns a random device token
 * (30 days, renewed on use) that the app sends as a Bearer token.
 *
 * ~/.tokaihub/owner.json holds passkey public keys and SHA-256 hashes of device tokens.
 * Nothing in it can sign in anywhere by itself.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

export const OWNER_ID = (process.env.HUB_OWNER_ID ?? '').trim().toUpperCase();
/** Origin of the hosted app. Passkeys are bound to its host name. */
export const APP_ORIGIN = (process.env.HUB_APP_ORIGIN ?? '').replace(/\/$/, '');
const RP_ID = APP_ORIGIN ? new URL(APP_ORIGIN).hostname : '';

const FILE = path.join(os.homedir(), '.tokaihub', 'owner.json');
const TOKEN_DAYS = 30;
const CODE_MINUTES = 10;

/** label: the device the passkey was created on. synced: backed up (iCloud Keychain, Google), so other devices can use it. */
interface Credential { id: string; publicKey: string; counter: number; transports?: AuthenticatorTransportFuture[]; label: string; createdAt: string; lastUsedAt?: string; synced?: boolean }
/** One signed-in device: the token a passkey unlock issued to it. */
/** site: the web address the device signed in from (two browsers on one Mac look alike otherwise). */
interface Token { hash: string; credentialId: string; expiresAt: number; label?: string; site?: string; createdAt?: number; lastUsedAt?: number }
interface Store { ownerId: string; credentials: Credential[]; tokens: Token[] }

function load(): Store {
  try {
    const s = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Store;
    // A store written for another owner ID is not ours to use.
    if (s.ownerId === OWNER_ID) return s;
  } catch { /* first run */ }
  return { ownerId: OWNER_ID, credentials: [], tokens: [] };
}
let store = load();
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

export const configured = () => Boolean(OWNER_ID && APP_ORIGIN);
export const deviceCount = () => store.credentials.length;

// ── Setup codes (created on this Mac only) ─────────────────────────────────────────────────
let setup: { code: string; expiresAt: number; challenge?: string } | null = null;

export function createSetupCode() {
  const code = Array.from(crypto.randomBytes(8), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
  setup = { code, expiresAt: Date.now() + CODE_MINUTES * 60_000 };
  return { code, expiresAt: new Date(setup.expiresAt).toISOString() };
}

function checkCode(code: unknown) {
  const ok = setup && Date.now() < setup.expiresAt && typeof code === 'string'
    && code.length === setup.code.length
    && crypto.timingSafeEqual(Buffer.from(code.toUpperCase()), Buffer.from(setup.code));
  if (!ok) throw httpError(403, 'invalid or expired setup code');
  return setup!;
}

export async function registrationOptions(code: unknown) {
  const s = checkCode(code);
  const options = await generateRegistrationOptions({
    rpName: 'TokaiHub', rpID: RP_ID,
    userName: OWNER_ID, userDisplayName: OWNER_ID,
    userID: new TextEncoder().encode(OWNER_ID),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    excludeCredentials: store.credentials.map(c => ({ id: c.id, transports: c.transports })),
  });
  s.challenge = options.challenge;
  return options;
}

export async function registerDevice(code: unknown, response: any, label: unknown, site?: unknown) {
  const s = checkCode(code);
  if (!s.challenge) throw httpError(400, 'ask for registration options first');
  const v = await verifyRegistrationResponse({
    response, expectedChallenge: s.challenge, expectedOrigin: APP_ORIGIN, expectedRPID: RP_ID, requireUserVerification: true,
  });
  if (!v.verified || !v.registrationInfo) throw httpError(403, 'passkey not verified');
  setup = null; // single use
  const { credential, credentialBackedUp } = v.registrationInfo;
  store.credentials.push({
    id: credential.id, publicKey: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter,
    transports: credential.transports, label: String(label ?? 'device').slice(0, 60), createdAt: new Date().toISOString(),
    synced: credentialBackedUp,
  });
  return issueToken(credential.id, label, site);
}

// ── Unlock with a passkey ──────────────────────────────────────────────────────────────────
const challenges = new Map<string, number>(); // challenge → expiresAt

export async function authenticationOptions() {
  if (!store.credentials.length) throw httpError(409, 'no passkey set up yet');
  const options = await generateAuthenticationOptions({
    rpID: RP_ID, userVerification: 'required',
    allowCredentials: store.credentials.map(c => ({ id: c.id, transports: c.transports })),
  });
  const now = Date.now();
  for (const [c, exp] of challenges) if (exp < now) challenges.delete(c);
  challenges.set(options.challenge, now + 5 * 60_000);
  return options;
}

export async function unlock(response: any, label?: unknown, site?: unknown) {
  const cred = store.credentials.find(c => c.id === response?.id);
  if (!cred) throw httpError(403, 'unknown passkey');
  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: c => { const ok = (challenges.get(c) ?? 0) > Date.now(); challenges.delete(c); return ok; },
    expectedOrigin: APP_ORIGIN, expectedRPID: RP_ID, requireUserVerification: true,
    credential: { id: cred.id, publicKey: Buffer.from(cred.publicKey, 'base64url'), counter: cred.counter, transports: cred.transports },
  });
  if (!v.verified) throw httpError(403, 'passkey not verified');
  cred.counter = v.authenticationInfo.newCounter;
  cred.lastUsedAt = new Date().toISOString();
  if (v.authenticationInfo.credentialBackedUp) cred.synced = true;
  return issueToken(cred.id, label, site);
}

// ── Device tokens ──────────────────────────────────────────────────────────────────────────
const siteOf = (origin: unknown) => { try { return new URL(String(origin)).host || undefined; } catch { return undefined; } };

function issueToken(credentialId: string, label?: unknown, site?: unknown) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  store.tokens = store.tokens.filter(t => t.expiresAt > now);
  store.tokens.push({ hash: sha(token), credentialId, expiresAt: now + TOKEN_DAYS * 86_400_000, label: String(label ?? '').slice(0, 60) || undefined, site: siteOf(site), createdAt: now, lastUsedAt: now });
  save();
  return { token, ownerId: OWNER_ID };
}

let lastRenewSave = 0;
/** True when the Authorization header carries a live device token. Renews it on use. */
export function checkToken(header: string | undefined) {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  const h = sha(token);
  const t = store.tokens.find(x => x.hash.length === h.length && crypto.timingSafeEqual(Buffer.from(x.hash), Buffer.from(h)));
  if (!t || t.expiresAt < Date.now()) return false;
  if (!store.credentials.some(c => c.id === t.credentialId)) return false; // passkey removed
  t.expiresAt = Date.now() + TOKEN_DAYS * 86_400_000;
  t.lastUsedAt = Date.now();
  if (Date.now() - lastRenewSave > 3_600_000) { lastRenewSave = Date.now(); save(); }
  return true;
}

export function revokeToken(header: string | undefined) {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return;
  store.tokens = store.tokens.filter(t => t.hash !== sha(token));
  save();
}

const tokenOf = (header: string | undefined) => {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  return token ? store.tokens.find(t => t.hash === sha(token)) : undefined;
};

/**
 * Passkeys and, under each, the devices signed in with it (one synced passkey can serve an
 * iPhone and a Mac). `current` marks the device making the request.
 */
export function listDevices(header: string | undefined) {
  const current = tokenOf(header)?.hash;
  const now = Date.now();
  const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : null);
  return store.credentials.map(c => ({
    id: c.id, label: c.label, createdAt: c.createdAt, lastUsedAt: c.lastUsedAt ?? null, synced: Boolean(c.synced),
    sessions: store.tokens
      .filter(t => t.credentialId === c.id && t.expiresAt > now)
      .map(t => ({ id: t.hash.slice(0, 16), label: t.label ?? null, site: t.site ?? null, createdAt: iso(t.createdAt), lastUsedAt: iso(t.lastUsedAt), current: t.hash === current }))
      .sort((x, y) => (y.lastUsedAt ?? '').localeCompare(x.lastUsedAt ?? '')),
  }));
}

/** Signs one device out (its token); the passkey stays. */
export function removeSession(id: unknown) {
  const before = store.tokens.length;
  store.tokens = store.tokens.filter(t => typeof id !== 'string' || id.length !== 16 || !t.hash.startsWith(id));
  if (store.tokens.length === before) throw httpError(404, 'unknown device');
  save();
}

/** Forgets one passkey and signs out every device token it issued. */
export function removeDevice(id: unknown) {
  const before = store.credentials.length;
  store.credentials = store.credentials.filter(c => c.id !== id);
  if (store.credentials.length === before) throw httpError(404, 'unknown device');
  store.tokens = store.tokens.filter(t => t.credentialId !== id);
  save();
}

/** Removes every passkey and device token (scripts/hub.sh devices-reset). */
export function resetDevices() {
  store = { ownerId: OWNER_ID, credentials: [], tokens: [] };
  save();
}

// ── One-time file tickets (a download link cannot carry an Authorization header) ───────────
const tickets = new Map<string, { params: Record<string, string>; expiresAt: number }>();

export function fileTicket(params: Record<string, string>) {
  const id = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  for (const [k, v] of tickets) if (v.expiresAt < now) tickets.delete(k);
  tickets.set(id, { params, expiresAt: now + 60_000 });
  return id;
}

export function redeemTicket(id: unknown) {
  const t = typeof id === 'string' ? tickets.get(id) : undefined;
  if (typeof id === 'string') tickets.delete(id);
  return t && t.expiresAt > Date.now() ? t.params : null;
}

// ── Brute-force brake for the unauthenticated endpoints ────────────────────────────────────
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, perMinute = 20) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > perMinute;
}
