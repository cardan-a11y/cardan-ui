import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './test';
import type { OtherOrigins } from './network';
import { focusStop, gotoHydrated, inertElements } from './helpers';

/**
 * CookiesDialog and Google, on /cookies, which mounts the dialog as a
 * site does. The suite builds the playground with gtmId GTM-TEST (serve.mjs).
 * The other-origin guard fails any request to Google no test answers, so a
 * test that answers nothing proves the page asked Google for nothing.
 */

const route = '/cookies';
const kinds = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
];

type Consent = { necessary: boolean; analytics: boolean; marketing: boolean };

function dialogOf(page: Page) {
  return page.getByRole('dialog', { name: 'Cookies' });
}

/** Answers Tag Manager's script with an empty one, and counts the requests */
function answerTagManager(page: Page, otherOrigins: OtherOrigins) {
  otherOrigins.answer(
    (url) =>
      url.href === 'https://www.googletagmanager.com/gtm.js?id=GTM-TEST',
    { contentType: 'text/javascript' },
    'gtm.js?id=GTM-TEST',
  );
  const requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname.endsWith('googletagmanager.com'))
      requests.push(request.url());
  });
  return requests;
}

/** The choice of an earlier visit, as useCookie writes it */
async function storeConsent(
  context: BrowserContext,
  baseURL: string,
  granted: boolean,
) {
  const consent: Consent = {
    necessary: true,
    analytics: granted,
    marketing: granted,
  };
  await context.addCookies([
    {
      name: 'cookieConsent',
      value: encodeURIComponent(JSON.stringify(consent)),
      url: baseURL,
    },
  ]);
}

/** The consent commands in the data layer, in order */
function consentCommands(page: Page) {
  return page.evaluate(() =>
    ((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [])
      .filter(
        (entry) =>
          Object.prototype.toString.call(entry) === '[object Arguments]' &&
          (entry as IArguments)[0] === 'consent',
      )
      .map((entry) => Array.from(entry as IArguments)),
  );
}

const all = (value: 'granted' | 'denied') =>
  Object.fromEntries(kinds.map((kind) => [kind, value]));

test('a first visit opens the dialog and asks Google for nothing, also after Escape and a reload', async ({
  page,
}) => {
  await gotoHydrated(page, route);
  const dialog = dialogOf(page);

  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => (await focusStop(page, dialog)).inside)
    .toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await inertElements(page)).toEqual([]);
  await page.waitForLoadState('networkidle');

  // Without a choice it asks again
  await page.reload();
  await expect(dialogOf(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  // Only in the page: Tag Manager would find it once it loads
  expect(await consentCommands(page)).toEqual([
    ['consent', 'default', all('denied')],
  ]);
});

test('Accept loads Tag Manager once, with every kind of consent denied by default and then granted', async ({
  page,
  otherOrigins,
}) => {
  const requests = answerTagManager(page, otherOrigins);
  await gotoHydrated(page, route);

  await dialogOf(page).getByRole('button', { name: 'Accept' }).click();
  await expect(dialogOf(page)).toBeHidden();
  await expect.poll(() => requests.length).toBe(1);
  await page.waitForLoadState('networkidle');

  expect(requests).toHaveLength(1);
  expect(await consentCommands(page)).toEqual([
    ['consent', 'default', all('denied')],
    ['consent', 'update', all('granted')],
  ]);
});

test('Deny asks Google for nothing, on this visit and the next', async ({
  page,
}) => {
  await gotoHydrated(page, route);

  await dialogOf(page).getByRole('button', { name: 'Deny' }).click();
  await expect(dialogOf(page)).toBeHidden();
  await page.waitForLoadState('networkidle');

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(dialogOf(page)).toHaveCount(0);
});

test('a visitor who accepted before gets Tag Manager without the dialog', async ({
  page,
  context,
  baseURL,
  otherOrigins,
}) => {
  await storeConsent(context, baseURL!, true);
  const requests = answerTagManager(page, otherOrigins);

  await gotoHydrated(page, route);

  await expect.poll(() => requests.length).toBe(1);
  await expect(dialogOf(page)).toHaveCount(0);
  expect(await inertElements(page)).toEqual([]);
});

test('a visitor who denied before gets neither Tag Manager nor the dialog', async ({
  page,
  context,
  baseURL,
}) => {
  await storeConsent(context, baseURL!, false);

  await gotoHydrated(page, route);
  await page.waitForLoadState('networkidle');

  await expect(dialogOf(page)).toHaveCount(0);
});

test('Deny after an Accept tells Tag Manager every kind is denied', async ({
  page,
  otherOrigins,
}) => {
  const requests = answerTagManager(page, otherOrigins);
  await gotoHydrated(page, route);
  await dialogOf(page).getByRole('button', { name: 'Accept' }).click();
  await expect.poll(() => requests.length).toBe(1);

  await page.getByRole('button', { name: /^Cookies/ }).click();
  await dialogOf(page).getByRole('button', { name: 'Deny' }).click();
  await expect(dialogOf(page)).toBeHidden();

  expect((await consentCommands(page)).at(-1)).toEqual([
    'consent',
    'update',
    all('denied'),
  ]);
});

test('Accept after a Deny in the same visit loads Tag Manager', async ({
  page,
  otherOrigins,
}) => {
  const requests = answerTagManager(page, otherOrigins);
  await gotoHydrated(page, route);
  await dialogOf(page).getByRole('button', { name: 'Deny' }).click();
  await expect(dialogOf(page)).toBeHidden();

  await page.getByRole('button', { name: /^Cookies/ }).click();
  await dialogOf(page).getByRole('button', { name: 'Accept' }).click();

  await expect.poll(() => requests.length).toBe(1);
  expect((await consentCommands(page)).at(-1)).toEqual([
    'consent',
    'update',
    all('granted'),
  ]);
});

test('Accept, Deny and Accept again in one visit load Tag Manager once and leave consent granted', async ({
  page,
  otherOrigins,
}) => {
  const requests = answerTagManager(page, otherOrigins);
  await gotoHydrated(page, route);
  const cookiesButton = page.getByRole('button', { name: /^Cookies/ });

  await dialogOf(page).getByRole('button', { name: 'Accept' }).click();
  await expect.poll(() => requests.length).toBe(1);
  for (const choice of ['Deny', 'Accept']) {
    await cookiesButton.click();
    await dialogOf(page).getByRole('button', { name: choice }).click();
    await expect(dialogOf(page)).toBeHidden();
  }
  await page.waitForLoadState('networkidle');

  expect(requests).toHaveLength(1);
  expect((await consentCommands(page)).slice(1)).toEqual([
    ['consent', 'update', all('granted')],
    ['consent', 'update', all('denied')],
    ['consent', 'update', all('granted')],
  ]);
});
