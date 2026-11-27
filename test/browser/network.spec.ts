import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

// A `test.fail()` here fails in the fixture, so it has no `expect` of its own

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

test('a request to another origin fails the test', async ({
  page,
  pageErrors,
}) => {
  test.fail();
  // Named, so only the origin guard can fail it
  pageErrors.expect(/elsewhere\.example\.com/);
  await gotoHydrated(page, '/buttons');
  await fetchFrom(page, 'https://elsewhere.example.com/x');
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

test('an answer for a request that never came fails the test', async ({
  page,
  otherOrigins,
}) => {
  test.fail();
  otherOrigins.answer((url) => url.host === 'pay.example.com');
  await gotoHydrated(page, '/buttons');
});

test('the aborted request is kept, with its method and address', async ({
  page,
  pageErrors,
  otherOrigins,
}) => {
  pageErrors.expect(/elsewhere\.example\.com/);
  await gotoHydrated(page, '/buttons');

  expect(await fetchFrom(page, 'https://elsewhere.example.com/x')).toBe(
    'failed',
  );
  expect(otherOrigins.unanswered).toEqual([
    'GET https://elsewhere.example.com/x',
  ]);
  // Taken here so this test passes
  otherOrigins.unanswered.splice(0);
});
