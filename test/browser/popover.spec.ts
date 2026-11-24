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

test('Popover: focus that moved into it before its open event arrives stays there', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const list = page.getByRole('navigation', { name: 'More options' });

  // One task: the browser queues the popover's `toggle` event for later
  await trigger.focus();
  await trigger.evaluate((button: HTMLElement) => {
    const panel = document.getElementById(
      button.getAttribute('popovertarget')!,
    )!;
    // Its own focus move has run one task after the event
    panel.addEventListener(
      'toggle',
      () => setTimeout(() => (panel.dataset.settled = '')),
      { once: true },
    );
    button.click();
    [...panel.querySelectorAll<HTMLElement>('button')]
      .find((item) => item.textContent?.trim() === 'Duplicate')!
      .focus();
  });
  await page.waitForFunction(() => document.querySelector('[data-settled]'));

  await expect(list).toBeVisible();
  await expect(list.getByRole('button', { name: 'Duplicate' })).toBeFocused();
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

test('Popover: a second click on its trigger closes it', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const list = page.getByRole('navigation', { name: 'More options' });

  await trigger.click();
  await expect(list).toBeVisible();
  await trigger.click();
  await expect(list).toBeHidden();
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

  // Toggletip: the live region exists before its text; focus alone does not open it
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

test('Popover: opening above its trigger, near the sticky header, does not scroll the page', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const list = page.getByRole('navigation', { name: 'More options' });

  // 480px: the lowest where the header sticks; the menu is taller than the room below
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.addStyleTag({
    content: `main { padding-block: 100vh; }
      .popover-content .menu-list-item + .menu-list-item { margin-block-start: 3rem !important; }`,
  });
  await trigger.click();
  const menuHeight = (await list.boundingBox())!.height;
  await page.keyboard.press('Escape');

  const top = Math.min(menuHeight + 40, 480 - 60);
  await trigger.evaluate((element, top) => {
    window.scrollBy(0, element.getBoundingClientRect().top - top);
  }, top);
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await trigger.click();
  await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused();
  const listBox = (await list.boundingBox())!;
  const triggerBox = (await trigger.boundingBox())!;
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(triggerBox.y);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('Popover: a menu that fits on neither side of its trigger scrolls its first item into view', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'More options' });
  const edit = page.getByRole('button', { name: 'Edit' });

  // Taller than the room on either side of a trigger near the bottom
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.addStyleTag({
    content: `main { padding-block: 100vh; }
      .popover-content .menu-list-item + .menu-list-item { margin-block-start: 10rem !important; }`,
  });
  await trigger.evaluate((element) => {
    window.scrollBy(0, element.getBoundingClientRect().top - (480 - 60));
  });

  await trigger.click();
  await expect(edit).toBeFocused();
  await expect(edit).toBeInViewport({ ratio: 1 });
});
