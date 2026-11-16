/**
 * Signing out from LogoutDialog, against the playground's mock Fortify
 * endpoints. nuxt-auth-sanctum goes to `redirect.onLogout` once the API has
 * signed out; the dialog closes on its own page first. Closing on the next
 * page showed that page's language in the dialog's closing frames (the
 * Academy's login page takes the language of the last public page).
 */
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('LogoutDialog: closes on its own page before the sign-out leaves it', async ({
  page,
}) => {
  // A session: the playground signs in with any password and code
  await gotoHydrated(page, '/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
  await page.locator('input[name="password"]').fill('secret');
  await page.locator('input[name="password"]').press('Enter');
  await page.waitForURL('**/two-factor-authentication');
  await page.locator('input[autocomplete="one-time-code"]').fill('123456');
  await page.locator('input[autocomplete="one-time-code"]').press('Enter');
  await page.waitForURL('**/auth');

  // The page and the dialog's state in every frame
  await page.evaluate(() => {
    const frames: { path: string; open: boolean; closing: boolean }[] = [];
    (window as unknown as { frames_: typeof frames }).frames_ = frames;
    const record = () => {
      // The page's and the user menu's, which share the composable
      const dialogs = [
        ...document.querySelectorAll<HTMLDialogElement>('.logout-dialog'),
      ];
      frames.push({
        path: location.pathname,
        open: dialogs.some((dialog) => dialog.open),
        closing: dialogs.some((dialog) => dialog.hasAttribute('closing')),
      });
      requestAnimationFrame(record);
    };
    record();
  });

  await page.getByRole('button', { name: 'Sign out' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign out' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL((url) => url.pathname === '/');

  const frames = await page.evaluate(
    () =>
      (
        window as unknown as {
          frames_: { path: string; open: boolean; closing: boolean }[];
        }
      ).frames_,
  );
  const onAuth = frames.filter((frame) => frame.path === '/auth');

  // It played its closing animation here, and was closed when the page changed
  expect(onAuth.some((frame) => frame.closing)).toBe(true);
  expect(onAuth.at(-1)).toMatchObject({ open: false });
  expect(
    frames.filter((frame) => frame.path !== '/auth' && frame.open),
  ).toEqual([]);
});
