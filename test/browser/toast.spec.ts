// WCAG 2.2.1. The timer is a CSS animation, which page.clock does not drive:
// the tests move it on to just before its end.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { focusStop, gotoHydrated, tabKey } from './helpers';

test.use({ reducedMotion: 'reduce' });

const toasts = (page: Page) => page.locator('#teleports [aria-live] section');

async function addToast(page: Page) {
  await gotoHydrated(page, '/text');
  await page
    .getByRole('button', { name: 'Add Toast with a 5s timeout' })
    .click();
  await page.mouse.move(0, 0);
  await expect(toasts(page)).toHaveCount(1);
}

async function almostRunOut(page: Page, msLeft: number) {
  await page.evaluate((msLeft) => {
    const timer = document
      .getAnimations()
      .find(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.animationName === 'cardan-scale-x' &&
          animation.effect instanceof KeyframeEffect &&
          !!animation.effect.target?.closest('#teleports'),
      );
    if (!timer) throw new Error('The toast has no timer');
    timer.currentTime =
      Number(timer.effect!.getComputedTiming().endTime) - msLeft;
  }, msLeft);
}

async function expectToWait(page: Page) {
  // Only a wait shows that nothing happens
  await almostRunOut(page, 200);
  await page.waitForTimeout(1000);
  await expect(toasts(page)).toHaveCount(1);
}

test('a toast waits while the pointer is over it, and hides after it leaves', async ({
  page,
}) => {
  await addToast(page);

  await toasts(page).hover();
  await expectToWait(page);

  await page.mouse.move(0, 0);
  await expect(toasts(page)).toHaveCount(0);
});

test('a toast waits while focus is in it, and hides after focus leaves', async ({
  page,
}) => {
  await addToast(page);
  const close = toasts(page).getByRole('button', { name: 'Close' });

  await close.focus();
  await expectToWait(page);
  await expect(close).toBeFocused();

  await page.keyboard.press(tabKey(page, { reverse: true }));
  expect((await focusStop(page, toasts(page))).inside).toBe(false);
  await expect(toasts(page)).toHaveCount(0);
});
