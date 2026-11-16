/**
 * SidebarLayout's sticky panel with `side-label` on the playground's /layout
 * page: text only, so nothing in it takes focus. While it scrolls on its own
 * it is a tab stop itself, named, and the keyboard scrolls it to its last
 * line; WebKit does not focus a scroll container without a tabindex. A panel
 * that fits is no tab stop.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

const order = (page: Page) =>
  page.getByRole('complementary', { name: 'Your order' });
const total = (page: Page) => order(page).locator('dt', { hasText: /^Total$/ });

/** Tab from the last link of the panel above, until the order or 5 stops */
async function tabToOrder(page: Page) {
  await page.getByRole('link', { name: 'Compatible' }).focus();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    if (await order(page).evaluate((el) => el === document.activeElement)) {
      return;
    }
  }
}

for (const key of ['End', 'PageDown']) {
  test(`a text-only panel that scrolls is reached by Tab, named, and ${key} scrolls it to its last line`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoHydrated(page, '/layout');

    // The panel is what scrolls
    await expect(order(page)).toHaveAttribute('tabindex', '0');
    expect(
      await order(page).evaluate(
        (el) =>
          getComputedStyle(el).overflowY === 'auto' &&
          el.scrollHeight > el.clientHeight,
      ),
    ).toBe(true);

    await tabToOrder(page);
    await expect(order(page)).toBeFocused();
    await expect(order(page)).toHaveAccessibleName('Your order');
    await expect(total(page)).not.toBeInViewport();

    // End at once; PageDown moves by most of the panel's height, so it may
    // take another press
    await expect(async () => {
      await page.keyboard.press(key);
      await expect(total(page)).toBeInViewport({ timeout: 1_000 });
    }).toPass({ timeout: 5_000 });
    await expect(order(page)).toBeFocused();
  });
}

test('a panel that fits is no tab stop, and becomes one once it scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1800 });
  await gotoHydrated(page, '/layout');

  await expect(order(page)).toHaveAccessibleName('Your order');
  await expect(order(page)).not.toHaveAttribute('tabindex');
  await tabToOrder(page);
  await expect(order(page)).not.toBeFocused();

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(order(page)).toHaveAttribute('tabindex', '0');

  // Stacked below 1024px the panel no longer scrolls on its own
  await page.setViewportSize({ width: 900, height: 720 });
  await expect(order(page)).not.toHaveAttribute('tabindex');
});

for (const [why, width, height] of [
  ['the layout stacks', 900, 720],
  ['the panel fits', 1280, 1800],
] as const) {
  test(`the focused panel keeps focus when ${why}, and is no tab stop once focus leaves`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoHydrated(page, '/layout');
    await expect(order(page)).toHaveAttribute('tabindex', '0');
    await order(page).focus();

    // A keyboard user zooms in, or the window grows
    await page.setViewportSize({ width, height });
    await expect(order(page)).not.toHaveAttribute('tabindex', '0');
    await expect(order(page)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(order(page)).not.toBeFocused();
    await expect(order(page)).not.toHaveAttribute('tabindex');
    await page.keyboard.press('Shift+Tab');
    await expect(order(page)).not.toBeFocused();
  });
}
