/**
 * The modal dialogs (APG dialog pattern) where only a browser shows it: the
 * native `<dialog>` in the top layer, its initial focus, Tab kept inside,
 * Escape through the browser's `cancel`, focus back to the opener, and no
 * `inert` left behind on the page.
 *
 * The dialog page mounts CookiesDialog on the first press of its button only,
 * so a visit does not open it as it does on a site without a stored choice.
 */
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { focusStop, focusWalk, gotoHydrated, inertElements } from './helpers';

/** Opens the dialog from its trigger and holds it to the pattern */
async function expectModalPattern(
  page: Page,
  trigger: Locator,
  dialog: Locator,
) {
  await trigger.click();
  await expect(dialog).toBeVisible();

  // Focus moves inside
  await expect
    .poll(async () => (await focusStop(page, dialog)).inside)
    .toBe(true);
  const first = await focusStop(page, dialog);

  // Tab and Shift+Tab stay inside, and come around to where they started
  for (const reverse of [false, true]) {
    const stops = await focusWalk(page, 60, { reverse, within: dialog });
    expect(stops.filter((stop) => !stop.inside)).toEqual([]);
    expect(stops.map((stop) => stop.key)).toContain(first.key);
  }

  // Escape closes, focus goes back to the trigger, nothing stays inert
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await inertElements(page)).toEqual([]);
}

test('Dialog: focus inside, Tab wraps both ways, Escape closes and returns focus', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await expectModalPattern(
    page,
    page.getByRole('button', { name: 'Open dialog center' }),
    page.getByRole('dialog', { name: 'Dialog title' }),
  );
});

test('Dialog: the close button closes and returns focus too', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog right' });
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });

  await trigger.click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await inertElements(page)).toEqual([]);
});

test('MobileMenu: focus inside, Tab wraps both ways, Escape closes and returns focus', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open left menu' });

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await expectModalPattern(
    page,
    trigger,
    page
      .getByRole('dialog', { name: 'Mobile menu' })
      .and(page.locator(':visible')),
  );
});

test('MobileMenu: a click on the backdrop closes and returns focus', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open right menu' });
  const menu = page
    .getByRole('dialog', { name: 'Mobile menu' })
    .and(page.locator(':visible'));

  await trigger.click();
  await expect(menu).toBeVisible();
  // The menu is at the right: a click at the left lands on the backdrop
  await page.mouse.click(5, 300);
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await inertElements(page)).toEqual([]);
});

/** The requests to Google Tag Manager, aborted: the suite asks Google nothing */
async function blockGtm(context: BrowserContext) {
  const requests: string[] = [];
  await context.route('https://www.googletagmanager.com/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  return requests;
}

/** The consent choice in the cookie, or undefined without one */
async function storedConsent(context: BrowserContext) {
  const cookie = (await context.cookies()).find(
    (cookie) => cookie.name === 'cookieConsent',
  );
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : undefined;
}

test('CookiesDialog: the page does not open it on load', async ({
  page,
  context,
}) => {
  const gtm = await blockGtm(context);
  await gotoHydrated(page, '/dialog');

  await expect(page.getByRole('dialog', { name: 'Cookies' })).toHaveCount(0);
  expect(await inertElements(page)).toEqual([]);
  expect(gtm).toEqual([]);
});

test('CookiesDialog: focus inside, Tab wraps both ways, Escape closes without a choice', async ({
  page,
  context,
}) => {
  const gtm = await blockGtm(context);
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open cookies dialog' });
  const dialog = page.getByRole('dialog', { name: 'Cookies' });

  await expectModalPattern(page, trigger, dialog);
  expect(await storedConsent(context)).toBeUndefined();

  // Closed without a choice, it opens again from the same button
  await expectModalPattern(page, trigger, dialog);
  expect(gtm).toEqual([]);
});

for (const [choice, granted] of [
  ['Accept', true],
  ['Deny', false],
] as const) {
  test(`CookiesDialog: ${choice} closes, stores the choice and returns focus`, async ({
    page,
    context,
  }) => {
    const gtm = await blockGtm(context);
    await gotoHydrated(page, '/dialog');
    const trigger = page.getByRole('button', { name: 'Open cookies dialog' });
    const dialog = page.getByRole('dialog', { name: 'Cookies' });

    await trigger.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: choice }).click();

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await inertElements(page)).toEqual([]);
    expect(await storedConsent(context)).toEqual({
      necessary: true,
      analytics: granted,
      marketing: granted,
    });
    // Without a gtmId, Accept loads no script either (the test below)
    expect(gtm).toEqual([]);
  });
}

/** Aborts and records every request to a Google host, GTM or another */
async function blockGoogle(context: BrowserContext) {
  const requests: string[] = [];
  const google =
    /(^|\.)(google|googletagmanager|google-analytics|googleadservices|googlesyndication|doubleclick|googleapis|gstatic)\.[a-z]+(\.[a-z]+)?$/;
  await context.route(
    (url) => google.test(url.hostname),
    (route) => {
      requests.push(route.request().url());
      return route.abort();
    },
  );
  return requests;
}

// The playground sets no runtimeConfig.public.gtmId, as a project without a
// container: Accept stores the choice and nothing goes to Google, then or on
// the next visit with that choice in the cookie
test('CookiesDialog: Accept without a gtmId asks Google for nothing', async ({
  page,
  context,
}) => {
  const google = await blockGoogle(context);
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open cookies dialog' });
  const dialog = page.getByRole('dialog', { name: 'Cookies' });

  await trigger.click();
  await dialog.getByRole('button', { name: 'Accept' }).click();
  await expect(dialog).toBeHidden();
  expect((await storedConsent(context))?.analytics).toBe(true);
  await page.waitForLoadState('networkidle');
  expect(google).toEqual([]);

  // The next visit mounts the dialog with the accepted choice in the cookie
  await gotoHydrated(page, '/dialog');
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(google).toEqual([]);
});
