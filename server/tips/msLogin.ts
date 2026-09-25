/**
 * Drives Microsoft's sign-in pages in the bridge's headless browser when a silent re-sign-in is
 * not enough (Microsoft asks for the password again, or for MFA). The account and password come
 * from the Keychain (keychain.ts). The second factor stays with the owner: the number Microsoft
 * shows is published to the app, and a one-time code, if Microsoft asks for one, is typed by the
 * owner in the app and relayed here.
 */
import type { Page } from 'playwright';
import { storedAccount, storedPassword } from './keychain';

export type MfaPrompt = { kind: 'number'; number: string } | { kind: 'approve' } | { kind: 'code' };

const DEADLINE_MS = 150_000; // Microsoft's own number-match prompt expires before this
const onMicrosoft = (p: Page) => /login\.microsoftonline\.com|login\.live\.com/.test(p.url());

const visible = async (p: Page, sel: string) => p.locator(sel).first().isVisible().catch(() => false);
const textOf = async (p: Page, sel: string) => (await p.locator(sel).first().innerText().catch(() => '')).trim();

/**
 * Walks the Microsoft pages until the browser leaves Microsoft (back to TIPS). Throws with a
 * short reason when Microsoft rejects the account or password, or when nobody approves in time.
 */
export async function driveMicrosoftLogin(page: Page, hooks: {
  prompt: (p: MfaPrompt | null) => void;
  /** Resolves with the code the owner typed in the app, or null on timeout. */
  code: () => Promise<string | null>;
}) {
  const account = await storedAccount();
  if (!account) throw new Error('auto sign-in is not set up');
  const until = Date.now() + DEADLINE_MS;
  let passwordSent = 0;
  try {
    while (Date.now() < until) {
      if (!onMicrosoft(page)) return;

      const error = (await textOf(page, '#usernameError')) || (await textOf(page, '#passwordError'));
      if (error) throw new Error(`Microsoft: ${error.slice(0, 120)}`);

      // Account picker: the stored account.
      const tile = page.locator('div[role="listitem"]', { hasText: account }).first();
      if (await tile.isVisible().catch(() => false)) { await tile.click(); await page.waitForTimeout(1500); continue; }

      if (await visible(page, 'input[name="loginfmt"]')) {
        await page.fill('input[name="loginfmt"]', account);
        await page.click('#idSIButton9');
        await page.waitForTimeout(2000);
        continue;
      }

      if (await visible(page, 'input[name="passwd"]')) {
        // A second password page right after the first means Microsoft did not accept it.
        if (passwordSent >= 2) throw new Error('Microsoft did not accept the stored password');
        const password = await storedPassword();
        if (!password) throw new Error('no password in the Keychain');
        await page.fill('input[name="passwd"]', password);
        passwordSent++;
        await page.click('#idSIButton9');
        await page.waitForTimeout(2500);
        continue;
      }

      // Number matching: the number to enter in Microsoft Authenticator.
      const number = await textOf(page, '#idRichContext_DisplaySign');
      if (number) { hooks.prompt({ kind: 'number', number }); await page.waitForTimeout(1500); continue; }

      // Method picker: prefer the Authenticator app notification.
      const notify = page.locator('[data-value="PhoneAppNotification"]').first();
      if (await notify.isVisible().catch(() => false)) { await notify.click(); await page.waitForTimeout(2000); continue; }

      // One-time code (authenticator app code or SMS): the owner types it in the app.
      if (await visible(page, 'input[name="otc"]')) {
        hooks.prompt({ kind: 'code' });
        const code = await hooks.code();
        if (!code) throw new Error('no code entered in time');
        await page.fill('input[name="otc"]', code);
        await page.click('#idSubmit_SAOTCC_Continue').catch(() => page.click('#idSIButton9'));
        await page.waitForTimeout(2500);
        continue;
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
    throw new Error('sign-in was not approved in time');
  } finally {
    hooks.prompt(null);
  }
}

/** True when the page is a Microsoft page that needs input (not a redirect in passing). */
export async function needsMicrosoftInput(page: Page) {
  if (!onMicrosoft(page)) return false;
  for (const sel of ['input[name="loginfmt"]', 'input[name="passwd"]', '#idRichContext_DisplaySign', 'input[name="otc"]', '#KmsiCheckboxField', '[data-value="PhoneAppNotification"]']) {
    if (await visible(page, sel)) return true;
  }
  return false;
}
