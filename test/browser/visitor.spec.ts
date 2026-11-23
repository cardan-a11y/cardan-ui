import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('a documentation page renders for a visitor, without a detour to /login', async ({
  page,
}) => {
  let identityRequests = 0;
  await page.route('**/api/user', (route) => {
    identityRequests++;
    return route.continue();
  });

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
  expect(identityRequests).toBe(1);
});
