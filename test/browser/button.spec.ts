// A browser test: a NuxtLink in happy-dom does not navigate on a click at all.
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('a loading link is not followed on Enter or a click', async ({ page }) => {
  await gotoHydrated(page, '/buttons');
  const heading = page.getByRole('heading', { level: 1 });
  const link = page.getByRole('main').getByRole('link', {
    name: 'Loading link',
  });

  await expect(link).toBeDisabled();
  await expect(link).toHaveAttribute('aria-busy', 'true');

  // Records the router's push and replace and the Navigation API's navigate event
  await page.evaluate(() => {
    const w = window as unknown as {
      navigations: string[];
      navigation: EventTarget;
    };
    w.navigations = [];
    w.navigation.addEventListener('navigate', () =>
      w.navigations.push('navigate'),
    );
    const router = (
      document.querySelector('#__nuxt') as unknown as {
        __vue_app__: {
          config: {
            globalProperties: {
              $router: Record<
                'push' | 'replace',
                (...args: unknown[]) => unknown
              >;
            };
          };
        };
      }
    ).__vue_app__.config.globalProperties.$router;
    for (const method of ['push', 'replace'] as const) {
      const original = router[method].bind(router);
      router[method] = (...args) => {
        w.navigations.push(method);
        return original(...args);
      };
    }
  });

  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  // The pointer cannot reach it (pointer-events: none), a click event can
  await link.dispatchEvent('click');

  expect(
    await page.evaluate(
      () => (window as unknown as { navigations: string[] }).navigations,
    ),
  ).toEqual([]);
  await expect(page).toHaveURL(/\/buttons$/);
  await expect(heading).toHaveText('Buttons & Links');
  await expect(link).toBeFocused();
});
