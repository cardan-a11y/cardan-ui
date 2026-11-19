/**
 * The bottom sheet (`position="block-end"`) keeps its content clear of the
 * screen's bottom edge on a phone, where the sheet ends at the viewport's
 * bottom.
 */
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('Dialog: the bottom sheet ends its content above the screen edge at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog bottom' }).click();

  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  await expect(dialog).toBeVisible();

  const gap = await dialog.evaluate(async (element) => {
    await Promise.allSettled(element.getAnimations().map((a) => a.finished));
    // The end of the content, as far as the sheet scrolls
    element.scrollTop = element.scrollHeight;
    const bottoms = [...element.querySelectorAll('*')]
      .map((child) => child.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => rect.bottom);
    return window.innerHeight - Math.max(...bottoms);
  });

  // The sheet's block padding, 1.5rem
  expect(gap).toBeGreaterThanOrEqual(24);
});
