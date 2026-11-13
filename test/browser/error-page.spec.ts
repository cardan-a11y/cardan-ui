/**
 * The layer's error page (app/error.vue, ErrorPageContent) in the
 * playground's production build: the status the server answers with, the
 * title and `<html lang>`, the way on (back to the page before, or home),
 * focus after an error in the browser, and axe in both color modes.
 */
import { expect, test, type Page } from '@playwright/test';
import { focusStop, gotoHydrated, runAxe } from './helpers';

const wayOn = (page: Page) => page.locator('.error-page-content a');
const skipLink = (page: Page) =>
  page.getByRole('link', { name: 'Skip to main content' });

/** The shell has focus, so the next Tab is the skip link */
async function expectFocusAtTop(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.className))
    .toContain('app-shell');
  await page.keyboard.press('Tab');
  await expect(skipLink(page)).toBeFocused();
}

test('a missing address answers 404, in the layout, with a link home on a direct load', async ({
  page,
}) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await gotoHydrated(page, '/this-page-does-not-exist');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(
    'Page not found',
  );
  await expect(page).toHaveTitle('Page not found | Cardan UI');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(main).toContainText('Error code 404');
  // The error's own English text and stack are for development only
  await expect(main.locator('pre')).toHaveCount(0);
  await expect(main).not.toContainText('Page not found: /');

  // The first page of the visit: focus stays where the browser starts
  expect((await focusStop(page)).onBody).toBe(true);
  await expect(wayOn(page)).toHaveText('Go to the homepage');
  await expect(wayOn(page)).toHaveAttribute('href', '/');

  await wayOn(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cardan UI');
});

test('the skip link and then the link home, on a page that errors after an await, end on the homepage', async ({
  page,
}) => {
  // A fresh context each time: the page's data is not in the browser yet
  await gotoHydrated(page, '/error-page/demo?status=404');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Page not found');

  await page.keyboard.press('Tab');
  await expect(skipLink(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  // At once, while the failed page would still be loading its data, had the
  // skip link rendered it again
  await page.keyboard.press('Tab');
  await expect(wayOn(page)).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/$/);
  await expect(heading).toHaveText('Cardan UI');
  // Not overtaken by the failed page's own error once its data arrives
  await page.waitForTimeout(500);
  await expect(heading).toHaveText('Cardan UI');
});

test('after an error in the browser, focus and the announcement are those of a new page, and back returns to the page before', async ({
  page,
}) => {
  await gotoHydrated(page, '/error-page');
  await page
    .getByRole('link', { name: 'A page you have no access to (403)' })
    .click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('No access');
  await expect(page).toHaveTitle('No access | Cardan UI');
  await expect(page.locator('.nuxt-route-announcer')).toHaveText(
    'No access | Cardan UI',
  );
  await expectFocusAtTop(page);

  await expect(wayOn(page)).toHaveText('Back to the previous page');
  await expect(wayOn(page)).toHaveAttribute('href', '/error-page');
  await wayOn(page).focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/error-page$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Error page',
  );
});

for (const fatal of [false, true]) {
  test(`back after middleware refused a page${fatal ? ' with a fatal error' : ''} returns to the page with the link`, async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    await page
      .getByRole('navigation', { name: 'Components' })
      .getByRole('link', { name: 'Error page' })
      .click();
    await expect(page).toHaveURL(/\/error-page$/);

    if (fatal) {
      // As a link to it would (the playground has none); the router rejects
      // the navigation with the error
      await page.evaluate(() =>
        (
          document.querySelector('#__nuxt') as unknown as {
            __vue_app__: {
              $nuxt: { $router: { push(to: string): Promise<unknown> } };
            };
          }
        ).__vue_app__.$nuxt.$router
          .push('/error-page/demo?refuse=fatal')
          .catch(() => {}),
      );
    } else {
      await page
        .getByRole('link', {
          name: 'A page whose middleware refuses access (403)',
        })
        .click();
    }
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('No access');
    // A non-fatal error stops the navigation; Nuxt adds the address of a
    // fatal one to the history
    await expect(page).toHaveURL(
      fatal ? /\/error-page\/demo\?refuse=fatal$/ : /\/error-page$/,
    );

    await expect(wayOn(page)).toHaveText('Back to the previous page');
    await expect(wayOn(page)).toHaveAttribute('href', '/error-page');
    await wayOn(page).click();

    await expect(heading).toHaveText('Error page');
    await expect(page).toHaveURL(/\/error-page$/);
  });
}

test("the page's own text replaces the status's", async ({ page }) => {
  await gotoHydrated(page, '/error-page/demo?status=404&text');

  await expect(page.getByRole('main')).toContainText(
    'The demo item you asked for does not exist.',
  );
  await expect(page.getByRole('main')).not.toContainText('mistyped');
});

test('back from a missing address, which Nuxt loads from the server, returns to the page with the link', async ({
  page,
}) => {
  await gotoHydrated(page, '/error-page');
  await page
    .getByRole('link', { name: 'A page that does not exist (404)' })
    .click();
  await expect(page).toHaveURL(/\/this-page-does-not-exist$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page not found',
  );

  await expect(wayOn(page)).toHaveText('Back to the previous page');
  await wayOn(page).click();
  await expect(page).toHaveURL(/\/error-page$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Error page',
  );
});

test('an error on the page the user is on takes focus to the top', async ({
  page,
}) => {
  await gotoHydrated(page, '/error-page');
  await page
    .getByRole('button', { name: 'Show an error on this page (500)' })
    .click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Something went wrong',
  );
  await expect(page).toHaveTitle('Something went wrong | Cardan UI');
  await expectFocusAtTop(page);

  // No page before this one: home, a fresh page load, where the next Tab is
  // the skip link too
  await wayOn(page).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cardan UI');
  await page.keyboard.press('Tab');
  await expect(skipLink(page)).toBeFocused();
});

test('Dutch: the text, the title and <html lang> follow the locale', async ({
  page,
}) => {
  await gotoHydrated(page, '/error-page');
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByText('Nederlands').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await page.keyboard.press('Escape');

  await page
    .getByRole('link', { name: 'A page you have no access to (403)' })
    .click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Geen toegang',
  );
  await expect(page).toHaveTitle('Geen toegang | Cardan UI');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(wayOn(page)).toHaveText('Terug naar de vorige pagina');
  await expect(page.locator('.error-page-content [lang]')).toHaveCount(0);
});

test('fits 320px without sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await gotoHydrated(page, '/error-page/demo?status=404&text');

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`axe finds nothing on the error page in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await gotoHydrated(page, '/this-page-does-not-exist');
    await expect(page.locator('html')).toHaveClass(
      new RegExp(`${colorScheme}-mode`),
    );

    expect(
      await runAxe(page, { exclude: ['.va-popup-btn', '.va-popup'] }),
    ).toEqual([]);
  });
}
