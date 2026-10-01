/**
 * Drives Microsoft's sign-in pages in the bridge's headless browser when a silent re-sign-in is
 * not enough (Microsoft asks for the password again, or for MFA). The account and password come
 * from the Keychain (keychain.ts).
 * The second factor is Microsoft's number matching: the number shown on the sign-in page goes to
 * the app, and the owner types it into Microsoft Authenticator on their phone. Nothing is typed
 * into TokaiHub.
 */
import type { Page } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import { storedAccount, storedPassword } from './keychain';

export type MfaPrompt = { kind: 'number'; number: string } | { kind: 'approve' };

const DEADLINE_MS = 150_000; // Microsoft's own number-match prompt expires before this
const onMicrosoft = (p: Page) => /login\.microsoftonline\.com|login\.live\.com/.test(p.url());

// Microsoft keeps hidden copies of the email and password fields on each other's screens (moved
// off screen, aria-hidden, or hidden by CSS), and Playwright reports some of them as visible.
// Matching them typed into the wrong screen (2026-10-01). A field counts only when the browser's
// own visibility check passes and it lies inside the viewport.
const shownIndex = (p: Page, sel: string) => p.evaluate(selector => {
  const els = [...document.querySelectorAll<HTMLElement>(selector)];
  return els.findIndex(el => {
    if (el.getAttribute('aria-hidden') === 'true' || el.classList.contains('moveOffScreen')) return false;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  });
}, sel).catch(() => -1);
const visible = async (p: Page, sel: string) => (await shownIndex(p, sel)) >= 0;
/** The copy of a field the person would see. */
const onScreen = async (p: Page, sel: string) => p.locator(sel).nth(Math.max(0, await shownIndex(p, sel)));
const EMAIL_FIELD = 'input[name="loginfmt"]';
const PASSWORD_FIELD = 'input[name="passwd"]';
const textOf = async (p: Page, sel: string) => {
  const el = p.locator(sel).first();
  if (!(await el.count().catch(() => 0))) return '';
  return (await el.innerText({ timeout: 1000 }).catch(() => '')).trim();
};

/**
 * Walks the Microsoft pages until the browser leaves Microsoft (back to TIPS). Throws with a
 * short reason when Microsoft rejects the account or password, or when nobody approves in time.
 */
export async function driveMicrosoftLogin(page: Page, hooks: { prompt: (p: MfaPrompt | null) => void }) {
  const account = await storedAccount();
  if (!account) throw new Error('auto sign-in is not set up');
  const until = Date.now() + DEADLINE_MS;
  let passwordSent = 0;
  let switchedMethod = 0;
  // Each new screen is logged by its heading (never field values), so a stuck sign-in can be traced.
  let lastScreen = '';
  const note = async () => {
    const heading = (await textOf(page, '#loginHeader, [role="heading"], h1, .text-title')).replace(/\s+/g, ' ').slice(0, 80);
    const screen = `${new URL(page.url()).pathname} · ${heading}`;
    if (screen !== lastScreen) { lastScreen = screen; console.log(`[signin] ${screen}`); }
  };
  try {
    while (Date.now() < until) {
      if (!onMicrosoft(page)) return;
      await note();

      const userError = await textOf(page, '#usernameError');
      if (userError) throw new Error(`Microsoft: ${userError.slice(0, 120)}`);
      // One retry on a password error: the page can redraw and clear the field while it settles
      // (seen 2026-10-01 as "please enter your password" with a correct Keychain entry).
      const passwordError = await textOf(page, '#passwordError');
      if (passwordError && passwordSent >= 2) throw new Error(`Microsoft: ${passwordError.slice(0, 120)}`);

      // Account picker: the stored account.
      const tile = page.locator('div[role="listitem"]', { hasText: account }).first();
      if (await tile.isVisible().catch(() => false)) { await tile.click(); await page.waitForTimeout(1500); continue; }

      const heading = await textOf(page, '#loginHeader, [role="heading"]');
      if (/パスワード|password/i.test(heading) && await visible(page, PASSWORD_FIELD)) {
        console.log(`[signin] typing the stored password (attempt ${passwordSent + 1})`);
        // A second password page right after the first means Microsoft did not accept it.
        if (passwordSent >= 2) throw new Error('Microsoft did not accept the stored password');
        const password = await storedPassword();
        if (!password) throw new Error('no password in the Keychain');
        await page.waitForTimeout(800); // let the page finish switching views
        const field = await onScreen(page, PASSWORD_FIELD);
        await field.focus();
        await field.fill('');
        await field.pressSequentially(password, { delay: 25 });
        if ((await field.inputValue()).length !== password.length) await field.fill(password);
        passwordSent++;
        await page.click('#idSIButton9');
        await page.waitForTimeout(2500);
        continue;
      }

      // Email screen. Checked after the password screen, which keeps a hidden copy of this field.
      if (!/パスワード|password/i.test(heading) && await visible(page, EMAIL_FIELD)) {
        await (await onScreen(page, EMAIL_FIELD)).fill(account);
        await page.click('#idSIButton9');
        await page.waitForTimeout(2000);
        continue;
      }

      // Number matching: the number to enter in Microsoft Authenticator.
      const number = await textOf(page, '#idRichContext_DisplaySign');
      if (number) { hooks.prompt({ kind: 'number', number }); await page.waitForTimeout(1500); continue; }

      // Method picker: prefer the Authenticator app notification.
      const notify = page.locator('[data-value="PhoneAppNotification"]').first();
      if (await notify.isVisible().catch(() => false)) { await notify.click(); await page.waitForTimeout(2000); continue; }

      // A code page (Authenticator code or SMS): switch to the Authenticator notification, which
      // shows the number to match. The method picker above then selects it.
      if (await visible(page, 'input[name="otc"]')) {
        const other = page.locator('#signInAnotherWay, a:has-text("別の方法"), a:has-text("another way")').first();
        if (switchedMethod < 2 && await other.isVisible().catch(() => false)) {
          switchedMethod++;
          await other.click();
          await page.waitForTimeout(2000);
          continue;
        }
        throw new Error('Microsoft asked for a one-time code; sign in at the Mac');
      }

      // "Stay signed in?": yes, and don't ask again, so the next re-sign-in stays silent.
      if (await visible(page, '#KmsiCheckboxField')) {
        await page.check('#KmsiCheckboxField').catch(() => {});
        await page.click('#idSIButton9');
        await page.waitForTimeout(2000);
        continue;
      }

      // Waiting for a push approval without a number.
      const body = (await textOf(page, 'body')).slice(0, 400);
      if (/承認|Approve|Authenticator/i.test(body)) hooks.prompt({ kind: 'approve' });
      await page.waitForTimeout(1500);
    }
    const stuck = (await textOf(page, 'body')).replace(/\s+/g, ' ').slice(0, 160);
    console.log(`[signin] gave up on: ${stuck}`);
    // Only on failure: a picture of the screen it stopped on (shows the account email, never the password).
    await page.screenshot({ path: path.join(os.homedir(), '.tokaihub', 'fixtures', 'signin-stuck.png') }).catch(() => {});
    throw new Error('sign-in was not approved in time');
  } finally {
    hooks.prompt(null);
  }
}

/** True when the page is a Microsoft page that needs input (not a redirect in passing). */
export async function needsMicrosoftInput(page: Page) {
  if (!onMicrosoft(page)) return false;
  for (const sel of [EMAIL_FIELD, PASSWORD_FIELD, '#idRichContext_DisplaySign', 'input[name="otc"]', '#KmsiCheckboxField', '[data-value="PhoneAppNotification"]']) {
    if (await visible(page, sel)) return true;
  }
  return false;
}
