import type { ConsoleMessage } from '@playwright/test';
import { expect, test } from './test';
import { PageErrors } from './console';
import { gotoHydrated } from './helpers';

test('a console error counts, after the first load too', async ({
  page,
  pageErrors,
}) => {
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => console.error('Something broke'));

  await expect.poll(() => pageErrors.problems()).toHaveLength(1);
  // Code run through evaluate() has no address of its own
  expect(pageErrors.take()).toEqual(['error: Something broke']);
});

test('an error nothing caught counts', async ({ page, pageErrors }) => {
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('Thrown in a handler');
    });
  });

  await expect.poll(() => pageErrors.problems()).toHaveLength(1);
  expect(pageErrors.take().map((p) => p.split(' (')[0])).toEqual([
    'pageerror: Thrown in a handler',
  ]);
});

test('a page the test opens itself counts too', async ({
  context,
  pageErrors,
}) => {
  const other = await context.newPage();
  await gotoHydrated(other, '/buttons');
  await other.evaluate(() => console.error('Something broke'));

  await expect.poll(() => pageErrors.problems()).toHaveLength(1);
  // Code run through evaluate() has no address of its own
  expect(pageErrors.take()).toEqual(['error: Something broke']);
});

test('a message the test names does not count', async ({
  page,
  pageErrors,
}) => {
  pageErrors.expect(/Something broke/);
  await gotoHydrated(page, '/buttons');
  await page.evaluate(() => console.error('Something broke'));
});

test('a named message that never came counts', async ({ page, pageErrors }) => {
  pageErrors.expect(/Something broke/);
  await gotoHydrated(page, '/buttons');

  expect(pageErrors.take()).toEqual([
    'expected message never came: /Something broke/',
  ]);
});

test('what the guard found fails the test at its end', ({ pageErrors }) => {
  test.fail();
  pageErrors.add({ type: 'error', text: 'Something broke', url: '' });
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
