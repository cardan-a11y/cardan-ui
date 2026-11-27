import { expect, test } from './test';
import { gotoHydrated, tabKey } from './helpers';

/** /tabs: two enabled tabs and a disabled third */
test.describe('Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/tabs');
  });

  const tab = (page: import('@playwright/test').Page, name: string) =>
    page
      .getByRole('tablist', { name: 'Demo tabs' })
      .getByRole('tab', { name });

  test('the tab list is one tab stop, and Tab from it reaches the open panel', async ({
    page,
  }) => {
    const first = tab(page, 'Accessibility requirements');
    const second = tab(page, 'Overflowing content');

    await first.focus();
    await page.keyboard.press(tabKey(page, { reverse: true }));
    await expect(first).not.toBeFocused();
    await page.keyboard.press(tabKey(page));
    await expect(first).toBeFocused();

    await page.keyboard.press(tabKey(page));
    const panel = page.getByRole('tabpanel', {
      name: 'Accessibility requirements',
    });
    await expect(panel).toBeFocused();

    await second.click();
    await page.keyboard.press(tabKey(page));
    await expect(
      page.getByRole('tabpanel', { name: 'Overflowing content' }),
    ).toBeFocused();
    await page.keyboard.press(tabKey(page, { reverse: true }));
    await expect(second).toBeFocused();
    await page.keyboard.press(tabKey(page, { reverse: true }));
    await expect(first).not.toBeFocused();
    await expect(second).not.toBeFocused();
  });

  test('the arrow keys move focus and select, wrap around the ends and pass the disabled tab', async ({
    page,
  }) => {
    const first = tab(page, 'Accessibility requirements');
    const second = tab(page, 'Overflowing content');
    await first.focus();

    await page.keyboard.press('ArrowRight');
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('tabpanel', { name: 'Overflowing content' }),
    ).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowLeft');
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Home');
    await expect(first).toBeFocused();
    await expect(first).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('End');
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'Disabled tab')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});
