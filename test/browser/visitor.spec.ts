import { expect, test as base } from './test';
import { withApi } from './api';
import { gotoHydrated } from './helpers';

// The API answers a guest, and nothing else: a page that asks for more fails
const test = withApi(base, expect, {
  routes: {
    'GET /api/user': () => ({
      status: 401,
      body: { message: 'Unauthenticated.' },
    }),
  },
});

test('a documentation page renders for a visitor, without a detour to /login', async ({
  page,
  api,
}) => {
  await gotoHydrated(page, '/buttons');
  expect(new URL(page.url()).pathname).toBe('/buttons');
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1 }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Accordion' }).first().click();
  await page.waitForURL('**/accordion');
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1 }),
  ).toBeVisible();
  expect(api.requestsTo('/api/user')).toHaveLength(1);
});
