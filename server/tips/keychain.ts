/**
 * The owner's Microsoft account for unattended re-sign-in, read from the macOS login Keychain.
 * The owner stores it once with:
 *
 *   security add-generic-password -s tokaihub-microsoft -a <university e-mail> -w
 *
 * (-w with no value makes `security` prompt for the password, so it never lands in shell
 * history). Nothing here writes the password anywhere: it is read only when Microsoft shows its
 * password field, passed to that field, and dropped.
 */
import { execFile } from 'node:child_process';

const SERVICE = 'tokaihub-microsoft';

function run(args: string[]): Promise<string | null> {
  return new Promise(resolve => {
    execFile('/usr/bin/security', args, { timeout: 10_000 }, (err, stdout) => resolve(err ? null : stdout));
  });
}

/** The stored account name (the e-mail), or null when auto sign-in is not set up. */
export async function storedAccount(): Promise<string | null> {
  const out = await run(['find-generic-password', '-s', SERVICE]);
  return out ? /"acct"<blob>="([^"]+)"/.exec(out)?.[1] ?? null : null;
}

let known: { at: number; value: boolean } | null = null;
/** Whether auto sign-in is set up (cached for a minute; `security` is not free to call). */
export async function autoLoginConfigured(): Promise<boolean> {
  if (known && Date.now() - known.at < 60_000) return known.value;
  known = { at: Date.now(), value: (await storedAccount()) !== null };
  return known.value;
}
/** Last known answer, refreshed in the background once it is a minute old (entries added later show up). */
export const autoLoginKnown = () => {
  if (!known || Date.now() - known.at >= 60_000) void autoLoginConfigured();
  return known?.value ?? false;
};

/** The stored password. Callers must not log or keep it. */
export async function storedPassword(): Promise<string | null> {
  const out = await run(['find-generic-password', '-s', SERVICE, '-w']);
  return out ? out.replace(/\n$/, '') : null;
}
