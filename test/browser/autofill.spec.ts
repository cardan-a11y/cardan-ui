// iCloud Passwords in Firefox sets `value` without any event: the form must still send it.
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

test('LoginForm: one Enter after a fill without input events signs in with the filled values', async ({
  page,
}) => {
  await gotoHydrated(page, '/login');
  const email = page.locator('input[name="email"]');
  const password = page.locator('input[name="password"]');

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
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/login',
  );
  await page.keyboard.press('Enter');

  expect((await login).postDataJSON()).toMatchObject({
    email: 'demo@example.com',
    password: 'secret',
  });
  await page.waitForURL('**/two-factor-authentication');
});
