/**
 * Values that a password manager fills in without an input event: iCloud
 * Passwords in Firefox sets `value` only. The field shows them and passes the
 * browser's validation, so the form must send them too, on the first Enter.
 */
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('LoginForm: one Enter after a fill without input events signs in with the filled values', async ({
  page,
}) => {
  await gotoHydrated(page, '/login');
  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');

  // As the extension does: the native setter, and no events
  for (const [field, value] of [
    [email, 'demo@example.com'],
    [password, 'secret'],
  ] as const) {
    await field.evaluate((element, value) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(element, value);
    }, value);
  }

  await password.focus();
  const login = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && new URL(request.url()).pathname === '/login',
  );
  await page.keyboard.press('Enter');

  expect((await login).postDataJSON()).toMatchObject({
    email: 'demo@example.com',
    password: 'secret',
  });
  await page.waitForURL('**/two-factor-authentication');
});
