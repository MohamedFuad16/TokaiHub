/**
 * Encrypted on-disk cache for parsed TIPS data (AES-256-GCM). Lives in ~/.tokaihub/cache,
 * outside the repo. The key is a random 32-byte file with 0600 permissions. Raw HTML and
 * cookies are never cached, only the JSON each screen needs.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DIR = path.join(os.homedir(), '.tokaihub', 'cache');
const KEY_FILE = path.join(os.homedir(), '.tokaihub', 'cache.key');

function key(): Buffer {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32), { mode: 0o600 });
  return fs.readFileSync(KEY_FILE);
}

const file = (k: string) => path.join(DIR, crypto.createHash('sha256').update(k).digest('hex').slice(0, 32) + '.bin');

export interface Entry<T> { data: T; cachedAt: number }

function encrypt(value: unknown): Buffer {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]);
}

function decrypt<T>(buf: Buffer): T {
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), body = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(body), d.final()]).toString('utf8'));
}

export function read<T>(k: string): Entry<T> | null {
  try { return decrypt<Entry<T>>(fs.readFileSync(file(k))); } catch { return null; }
}

export function write<T>(k: string, data: T): Entry<T> {
  const entry = { data, cachedAt: Date.now() };
  fs.writeFileSync(file(k), encrypt(entry), { mode: 0o600 });
  return entry;
}

/**
 * Sealed values outside the data cache (~/.tokaihub/<name>.bin, same key). Used for the
 * Microsoft sign-in cookies in hosted mode, so clearing the data cache does not sign out.
 */
const sealedFile = (name: string) => path.join(os.homedir(), '.tokaihub', `${name}.bin`);
export function seal(name: string, value: unknown) {
  key();
  fs.writeFileSync(sealedFile(name), encrypt(value), { mode: 0o600 });
}
export function unseal<T>(name: string): T | null {
  try { return decrypt<T>(fs.readFileSync(sealedFile(name))); } catch { return null; }
}
export function unsealRemove(name: string) {
  fs.rmSync(sealedFile(name), { force: true });
}

export function remove(k: string) {
  fs.rmSync(file(k), { force: true });
}

export function clear() {
  fs.rmSync(DIR, { recursive: true, force: true });
}
