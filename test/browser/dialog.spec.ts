import type { BrowserContext, Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { focusStop, focusWalk, gotoHydrated, inertElements } from './helpers';

async function expectModalPattern(
  page: Page,
  trigger: Locator,
  dialog: Locator,
) {
  await trigger.click();
  await expect(dialog).toBeVisible();

  await expect
    .poll(async () => (await focusStop(page, dialog)).inside)
    .toBe(true);
  const first = await focusStop(page, dialog);

  for (const reverse of [false, true]) {
    const stops = await focusWalk(page, 60, { reverse, within: dialog });
    expect(stops.filter((stop) => !stop.inside)).toEqual([]);
    expect(stops.map((stop) => stop.key)).toContain(first.key);
  }

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
  const backdropLeftOfMenu = { x: 5, y: 300 };
  await page.mouse.click(backdropLeftOfMenu.x, backdropLeftOfMenu.y);
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await inertElements(page)).toEqual([]);
});

/** The dialog's box once its entry animation has played */
async function settledBox(dialog: Locator) {
  return dialog.evaluate(async (element) => {
    await Promise.allSettled(element.getAnimations().map((a) => a.finished));
    const { left, right, top, bottom } = element.getBoundingClientRect();
    return { left, right, top, bottom };
  });
}

/** A press at one point and a release at another, as when selecting text */
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
}

/** A close starts in the click handler: `closing` is set before the click returns */
async function expectStaysOpen(dialog: Locator) {
  expect(
    await dialog.evaluate(
      (element: HTMLDialogElement) =>
        element.open && !element.hasAttribute('closing'),
    ),
  ).toBe(true);
}

/** Where the dialog's content ends */
async function contentBottom(dialog: Locator) {
  return dialog.evaluate((element) =>
    Math.max(
      ...[...element.querySelectorAll('*')]
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => rect.bottom),
    ),
  );
}

test('Dialog: a click in the empty part of a side panel leaves it open, one on the backdrop closes it', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog left' });
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });

  await trigger.click();
  const box = await settledBox(dialog);
  expect(await contentBottom(dialog)).toBeLessThan(box.bottom - 8);

  await page.mouse.click((box.left + box.right) / 2, box.bottom - 8);
  await expectStaysOpen(dialog);

  await page.mouse.click(box.right + 20, (box.top + box.bottom) / 2);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Dialog: a click in the padding of a centered dialog leaves it open', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog center' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  const box = await settledBox(dialog);
  const middle = (box.left + box.right) / 2;

  await page.mouse.click(middle, box.top + 6);
  await expectStaysOpen(dialog);
  await page.mouse.click(middle, box.bottom - 6);
  await expectStaysOpen(dialog);

  await page.mouse.click(middle, box.bottom + 20);
  await expect(dialog).toBeHidden();
});

test('Dialog: selecting text in a field and releasing over the backdrop leaves it open', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog left' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  const box = await settledBox(dialog);
  const field = dialog.getByRole('textbox', { name: 'Name' });

  await field.fill('Ada Lovelace');
  const fieldBox = (await field.boundingBox())!;
  const y = fieldBox.y + fieldBox.height / 2;
  await drag(page, { x: fieldBox.x + 4, y }, { x: box.right + 40, y });

  await expectStaysOpen(dialog);
  await expect(field).toHaveValue('Ada Lovelace');
});

test('Dialog: a press on the backdrop released in the panel leaves it open', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog left' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  const box = await settledBox(dialog);
  const y = (box.top + box.bottom) / 2;

  await drag(page, { x: box.right + 40, y }, { x: box.right - 40, y });
  await expectStaysOpen(dialog);
});

test('MobileMenu: a press in the panel released over the backdrop leaves it open', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open left menu' }).click();
  const menu = page
    .getByRole('dialog', { name: 'Mobile menu' })
    .and(page.locator(':visible'));
  const box = await settledBox(menu);
  const y = box.bottom - 20;

  await drag(page, { x: box.left + 20, y }, { x: box.right + 40, y });
  await expectStaysOpen(menu);

  await page.mouse.click(box.right + 40, y);
  await expect(menu).toBeHidden();
});

async function blockGtm(context: BrowserContext) {
  const requests: string[] = [];
  await context.route('https://www.googletagmanager.com/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  return requests;
}

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
    expect(gtm).toEqual([]);
  });
}

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

  // The next visit, with the accepted choice in the cookie
  await gotoHydrated(page, '/dialog');
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.waitForLoadState('networkidle');
  expect(google).toEqual([]);
});
