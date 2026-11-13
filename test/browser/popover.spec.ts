/**
 * Popover (a disclosure of links or buttons) and Tooltip (a toggletip with a
 * live region) on the native Popover API, which happy-dom does not have: the
 * browser's own `expanded` state of a `popovertarget` button, light dismiss
 * on Escape with focus back to the trigger, and the toggletip's text in the
 * accessibility tree.
 */
import { expect, test } from '@playwright/test';
import { axNode, focusStop, gotoHydrated } from './helpers';

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/tooltip');
});

test('Popover: opens from its trigger, expanded follows, focus on the first item, Escape closes', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const list = page.getByRole('navigation', { name: 'More options' });

  expect((await axNode(trigger)).properties.expanded).toBe(false);
  await expect(list).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(list).toBeVisible();
  expect((await axNode(trigger)).properties.expanded).toBe(true);
  await expect(list.getByRole('button', { name: 'Edit' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(trigger).toBeFocused();
  expect((await axNode(trigger)).properties.expanded).toBe(false);
});

test('Popover: Tab past the last item leaves and closes it', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Popover label' });
  const link = page.getByRole('link', {
    name: 'accessibility of the popover attribute',
  });

  await trigger.click();
  await expect(link).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(link).toBeHidden();
  const stop = await focusStop(page);
  expect(stop.onBody).toBe(false);
  await expect(trigger).not.toBeFocused();
});

test('Popover: Shift+Tab from the first item goes back to the trigger and keeps it open', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const edit = page.getByRole('button', { name: 'Edit' });

  await trigger.click();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(trigger).toBeFocused();
  await expect(edit).toBeVisible();
});

test('Tooltip: a toggletip, opened by its button, its text in a live region, Escape closes', async ({
  page,
}) => {
  const trigger = page.getByRole('button', {
    name: 'More info about Live regions',
  });
  const text = page
    .getByText('Live regions are used to present changes')
    .first();

  const region = trigger.locator('xpath=ancestor::*[@aria-live][1]');

  // The live region is there before the text, which it announces when the
  // text arrives; focus alone does not open a toggletip
  await trigger.focus();
  expect((await axNode(region)).properties).toMatchObject({ live: 'polite' });
  await expect(text).not.toBeAttached();

  await page.keyboard.press('Enter');
  await expect(text).toBeVisible();
  await expect(trigger).toBeFocused();
  expect((await axNode(text)).ignored).toBe(false);
  await expect(region).toContainText(
    'Live regions are used to present changes',
  );

  await page.keyboard.press('Escape');
  await expect(text).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('Tooltip: focus moving on closes it', async ({ page }) => {
  const trigger = page.getByRole('button', {
    name: 'More info about Live regions',
  });
  const text = page
    .getByText('Live regions are used to present changes')
    .first();

  await trigger.click();
  await expect(text).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(text).toBeHidden();
});
