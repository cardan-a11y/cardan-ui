/**
 * A toast with a timeout waits while the pointer is over it or focus is in
 * it (WCAG 2.2.1 Timing Adjustable), and hides once both have left. Its
 * timer is a CSS animation, which a fake clock does not drive, so the tests
 * move that animation on to just before its end instead of waiting it out.
 * With reduced motion a toast leaves at once, so it is gone, not fading.
 */
import { expect, test, type Page } from '@playwright/test';
import { focusStop, gotoHydrated, tabKey } from './helpers';

test.use({ reducedMotion: 'reduce' });

const toasts = (page: Page) => page.locator('#teleports [aria-live] section');

/** Adds a toast that hides after 5s, with the pointer away from it */
async function addToast(page: Page) {
  await gotoHydrated(page, '/text');
  await page
    .getByRole('button', { name: 'Add Toast with a 5s timeout' })
    .click();
  await page.mouse.move(0, 0);
  await expect(toasts(page)).toHaveCount(1);
}

/** Moves the toast's timer on to `left` ms before it ends */
async function almostRunOut(page: Page, left: number) {
  await page.evaluate((left) => {
    const timer = document
      .getAnimations()
      .find(
        (animation) =>
          animation instanceof CSSAnimation &&
          animation.animationName === 'scale-x' &&
          animation.effect instanceof KeyframeEffect &&
          !!animation.effect.target?.closest('#teleports'),
      );
    if (!timer) throw new Error('The toast has no timer');
    timer.currentTime =
      Number(timer.effect!.getComputedTiming().endTime) - left;
  }, left);
}

/**
 * The timer has 200ms left: were it running, the toast would be gone well
 * within this wait. A wait is the only way to see that nothing happens.
 */
async function expectToWait(page: Page) {
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
