import type { Page } from '@playwright/test';
import { withOtherOrigins } from './network';
import { expect, test, withConsoleGuard } from './test';
import { gotoHydrated } from './helpers';

/** Fetches `url` in the page: the status and text, or 'failed' */
const fetchFrom = (page: Page, url: string) =>
  page.evaluate(
    (url) =>
      fetch(url).then(
        async (response) => `${response.status} ${await response.text()}`,
        () => 'failed',
      ),
    url,
  );

/** The playground under another origin: the same server, by its IP */
const elsewhere = (baseURL?: string) => {
  const url = new URL(baseURL!);
  url.hostname = '127.0.0.1';
  return url;
};

test('a request to another origin is aborted and counts', async ({
  page,
  pageErrors,
  otherOrigins,
}) => {
  pageErrors.expect(/elsewhere\.example\.com/);
  await gotoHydrated(page, '/buttons');

  expect(await fetchFrom(page, 'https://elsewhere.example.com/x')).toBe(
    'failed',
  );
  expect(otherOrigins.take()).toEqual(['GET https://elsewhere.example.com/x']);
});

test('a request the test answers goes no further, and passes', async ({
  page,
  otherOrigins,
}) => {
  otherOrigins.answer((url) => url.host === 'pay.example.com', {
    body: 'Paid',
  });
  await gotoHydrated(page, '/buttons');

  expect(await fetchFrom(page, 'https://pay.example.com/x')).toBe('200 Paid');
});

test('an answer for a request that never came counts', async ({
  page,
  otherOrigins,
}) => {
  otherOrigins.answer((url) => url.host === 'pay.example.com', {}, 'pay');
  await gotoHydrated(page, '/buttons');

  expect(otherOrigins.take()).toEqual([
    'an answered origin was never asked: pay',
  ]);
});

test('what the guard found fails the test at its end', ({ otherOrigins }) => {
  test.fail();
  otherOrigins.answer(() => false, {}, 'never');
});

const allowing = withOtherOrigins(withConsoleGuard, expect, {
  allow: (url) => url.hostname === '127.0.0.1',
});

allowing(
  'an allowed origin goes through, and counts for nothing',
  async ({ page, baseURL, otherOrigins }) => {
    await gotoHydrated(page, '/buttons');
    const reached = await page.evaluate(
      (url) =>
        fetch(url, { mode: 'no-cors' }).then(
          () => 'reached',
          () => 'failed',
        ),
      elsewhere(baseURL).href,
    );

    expect(reached).toBe('reached');
    expect(otherOrigins.take()).toEqual([]);
  },
);

test('without allow, the same origin is aborted', async ({
  page,
  baseURL,
  pageErrors,
  otherOrigins,
}) => {
  pageErrors.expect(/127\.0\.0\.1/);
  await gotoHydrated(page, '/buttons');
  const url = elsewhere(baseURL).href;

  expect(await fetchFrom(page, url)).toBe('failed');
  expect(otherOrigins.take()).toEqual([`GET ${url}`]);
});
