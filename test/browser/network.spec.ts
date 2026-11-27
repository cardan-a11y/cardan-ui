import type { Page } from '@playwright/test';
import { expect, test } from './test';
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
