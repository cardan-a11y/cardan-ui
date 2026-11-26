// A browser test: a NuxtLink in happy-dom does not navigate on a click at all.
import { expect, test } from '@playwright/test';
import { focusRingContrast, gotoHydrated } from './helpers';

for (const name of ['Loading link', 'Unavailable link']) {
  test(`${name}: not followed on Enter or a click`, async ({ page }) => {
    await gotoHydrated(page, '/buttons');
    const heading = page.getByRole('heading', { level: 1 });
    const link = page.getByRole('main').getByRole('link', { name });

    await expect(link).toBeDisabled();
    if (name === 'Loading link') {
      await expect(link).toHaveAttribute('aria-busy', 'true');
    }

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
    // A click event: Playwright's click() refuses an aria-disabled element
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
}

test('an aria-disabled submit button is reached with Tab and says why on a press, but does not submit', async ({
  page,
}) => {
  await gotoHydrated(page, '/buttons');
  const message = page.getByRole('textbox', { name: 'Message' });
  const agree = page.getByRole('checkbox', { name: 'I agree to the terms' });
  const send = page.getByRole('button', { name: 'Send' });
  const status = page.getByRole('status').filter({ hasText: /Sent|Not sent/ });

  await expect(send).toHaveAttribute('aria-disabled', 'true');
  await expect(send).toHaveAccessibleDescription(
    'Tick “I agree to the terms” to send.',
  );

  // Enter in a field submits through the form's default button: not this one
  await message.fill('Hello');
  await message.press('Enter');
  await expect(status).toHaveText(
    'Not sent: tick “I agree to the terms” first.',
  );

  await agree.focus();
  await page.keyboard.press('Tab');
  await expect(send).toBeFocused();
  // A submit would say "Sent." from then on
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  // The pointer reaches it too (Playwright's click() refuses aria-disabled)
  const box = (await send.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('button')?.textContent?.trim(),
      centre,
    ),
  ).toBe('Send');
  await page.mouse.click(centre.x, centre.y);
  await expect(status).toHaveText(
    'Not sent: tick “I agree to the terms” first.',
  );
  await expect(send).toBeFocused();

  await agree.check();
  await expect(send).not.toHaveAttribute('aria-disabled');
  await send.click();
  await expect(status).toHaveText('Sent.');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    for (const name of ['Unavailable button', 'Send']) {
      test(`${name}: an unavailable button's focus ring keeps 3:1`, async ({
        page,
      }) => {
        await gotoHydrated(page, '/buttons');
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toHaveAttribute('aria-disabled', 'true');
        await button.focus();
        await expect(button).toBeFocused();

        expect(await focusRingContrast(button)).toBeGreaterThanOrEqual(3);
      });
    }
  });
}
