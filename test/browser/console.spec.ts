import type { ConsoleMessage } from '@playwright/test';
import { expect, test } from './test';
import { PageErrors } from './console';
import { gotoHydrated } from './helpers';

// A failing test here fails in the fixture, so it has no `expect` of its own

test('a console error fails the test, after the first load too', async ({
  page,
}) => {
  test.fail();
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => console.error('Something broke'));
});

test('an error nothing caught fails the test', async ({ page }) => {
  test.fail();
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('Thrown in a handler');
    });
  });
  await page.waitForTimeout(50);
});

test('a page the test opens itself counts too', async ({ context }) => {
  test.fail();
  const other = await context.newPage();
  await gotoHydrated(other, '/buttons');
  await other.evaluate(() => console.error('Something broke'));
});

test('a message the test names does not fail it', async ({
  page,
  pageErrors,
}) => {
  pageErrors.expect(/Something broke/);
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => console.error('Something broke'));
});

test('a named message that never came fails the test', async ({
  page,
  pageErrors,
}) => {
  test.fail();
  pageErrors.expect(/Something broke/);
  await gotoHydrated(page, '/buttons');
});

test('counts errors and hydration warnings, not other warnings', () => {
  const errors = new PageErrors({
    ignore: (message) => message.url.endsWith('/api/user'),
  });
  const message = (
    type: ReturnType<ConsoleMessage['type']>,
    text: string,
    url = '',
  ) => ({
    type: () => type,
    text: () => text,
    location: () => ({
      url,
      line: 0,
      column: 0,
      lineNumber: 0,
      columnNumber: 0,
    }),
  });

  errors.addConsole(message('warning', 'A preload was not used'));
  errors.addConsole(message('log', 'Hello'));
  errors.addConsole(
    message('warning', 'Hydration completed but contains mismatches.'),
  );
  errors.addConsole(
    message(
      'error',
      'Failed to load resource: 401',
      'http://localhost/api/user',
    ),
  );
  errors.addConsole(
    message('error', 'Failed to load resource: 404', 'http://localhost/x'),
  );

  expect(errors.problems()).toEqual([
    'warning: Hydration completed but contains mismatches.',
    'error: Failed to load resource: 404 (http://localhost/x)',
  ]);
});
