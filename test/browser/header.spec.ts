import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('keyboard focus never stops under the sticky header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoHydrated(page, '/form');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const banner = page.getByRole('banner');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Shift+Tab');
    const covered = await page.evaluate(() => {
      const header = document.querySelector('header');
      const focused = document.activeElement;
      if (!header || !focused || header.contains(focused)) return false;
      if (focused.closest('dialog, [popover]')) return false;
      return (
        focused.getBoundingClientRect().top <
        header.getBoundingClientRect().bottom
      );
    });
    expect(covered, `stop ${i + 1}`).toBe(false);
  }
  await expect(banner).toBeInViewport();
});

test('on a screen under 480px high the header scrolls along with the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 400 });
  await gotoHydrated(page, '/form');
  await page.evaluate(() => window.scrollTo(0, 600));

  await expect(page.getByRole('banner')).not.toBeInViewport();
});
