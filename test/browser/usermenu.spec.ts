import { expect, test, type Page } from '@playwright/test';
import {
  axNode,
  focusStop,
  gotoHydrated,
  inertElements,
  tabKey,
} from './helpers';

const isChromium = (page: Page) =>
  page.context().browser()?.browserType().name() === 'chromium';

function parts(page: Page) {
  const trigger = page
    .getByRole('banner')
    .getByRole('button', { name: 'User menu C', exact: true });
  return {
    trigger,
    panel: page.locator('.user-menu-popover'),
    theme: page
      .getByRole('group', { name: 'Theme' })
      .getByRole('radio', { checked: true }),
    english: page.getByRole('radio', { name: 'English' }),
    signOut: page
      .getByRole('navigation', { name: 'User menu' })
      .getByRole('button', { name: 'Sign out' }),
  };
}

async function expanded(page: Page) {
  const { trigger } = parts(page);
  if (isChromium(page)) {
    const node = await axNode(trigger);
    expect(node.ignored).toBe(false);
    return node.properties.expanded;
  }
  return (await trigger.getAttribute('aria-expanded')) === 'true';
}

test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/buttons');
});

test('opens from its trigger with focus on the first item, the trigger stays usable and closes it, nothing inert', async ({
  page,
}) => {
  const { trigger, panel, theme } = parts(page);
  expect(await expanded(page)).toBe(false);
  await expect(panel).toBeHidden();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await expect(theme).toBeFocused();
  expect(await expanded(page)).toBe(true);
  expect(await inertElements(page)).toEqual([]);

  await expect(trigger).toBeVisible();
  await page.keyboard.press(tabKey(page, { reverse: true }));
  await expect(trigger).toBeFocused();
  await expect(panel).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await expanded(page)).toBe(false);

  await trigger.click();
  await expect(panel).toBeVisible();
  await trigger.click();
  await expect(panel).toBeHidden();
});

test('Tab past the last item leaves and closes it', async ({ page }) => {
  const { trigger, panel, theme, english, signOut } = parts(page);

  await trigger.click();
  await expect(theme).toBeFocused();
  await page.keyboard.press(tabKey(page));
  await expect(english).toBeFocused();
  await page.keyboard.press(tabKey(page));
  await expect(signOut).toBeFocused();

  await page.keyboard.press(tabKey(page));
  await expect(panel).toBeHidden();
  const stop = await focusStop(page);
  expect(stop.onBody).toBe(false);
  await expect(trigger).not.toBeFocused();
  expect(await expanded(page)).toBe(false);
});

test('Escape closes it and gives focus back to the trigger, also after a click opened it', async ({
  page,
}) => {
  const { trigger, panel, theme } = parts(page);

  await trigger.click();
  await expect(theme).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await expanded(page)).toBe(false);
});

test('a click outside it closes it, one on its text does not', async ({
  page,
}) => {
  const { trigger, panel } = parts(page);

  await trigger.click();
  await panel.getByText('contact@cardan.com').click();
  await expect(panel).toBeVisible();

  await page.getByRole('main').click({ position: { x: 5, y: 5 } });
  await expect(panel).toBeHidden();
  expect(await expanded(page)).toBe(false);
});

for (const width of [320, 1280]) {
  test(`at ${width}px it is under the header, in view and covered by nothing`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 640 });
    const { trigger, panel } = parts(page);

    // The sticky header over the scrolled page
    await page.mouse.wheel(0, 400);
    await trigger.click();
    await expect(panel).toBeVisible();
    await panel.evaluate((el) =>
      Promise.all(el.getAnimations().map((a) => a.finished)),
    );

    const box = (await panel.boundingBox())!;
    const header = (await page.getByRole('banner').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(640);
    expect(Math.abs(box.y - (header.y + header.height))).toBeLessThanOrEqual(1);

    const covered = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const points = [
        [r.left + 2, r.top + 2],
        [r.right - 2, r.top + 2],
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 2, r.bottom - 2],
        [r.right - 2, r.bottom - 2],
      ];
      return points.filter(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!);
        return !hit || !el.contains(hit);
      });
    });
    expect(covered).toEqual([]);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test('an item that closes it before its open event arrives leaves focus on the trigger, not in the closed panel', async ({
  page,
}) => {
  const { trigger, panel, signOut } = parts(page);
  const dialog = page.getByRole('alertdialog', { name: 'Sign out' });

  // One task: the browser queues the popover's `toggle` event for later
  await trigger.focus();
  await trigger.evaluate((button: HTMLElement) => {
    button.click();
    [...document.querySelectorAll<HTMLElement>('.user-menu-popover button')]
      .find((item) => item.textContent?.trim() === 'Sign out')!
      .click();
  });
  await expect(dialog).toBeVisible();
  await expect(panel).toBeHidden();
  await expect(signOut).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('focus that moved into the panel before its open event arrives stays there', async ({
  page,
}) => {
  const { trigger, panel, signOut } = parts(page);

  await trigger.focus();
  await trigger.evaluate((button: HTMLElement) => {
    button.click();
    [...document.querySelectorAll<HTMLElement>('.user-menu-popover button')]
      .find((item) => item.textContent?.trim() === 'Sign out')!
      .focus();
  });
  await expect(panel).toBeVisible();
  // The open event has run once the trigger says so
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(signOut).toBeFocused();
});

test('Sign out closes the menu, opens the LogoutDialog, and closing that gives focus back to the trigger', async ({
  page,
}) => {
  const { trigger, panel, theme, signOut } = parts(page);
  const dialog = page.getByRole('alertdialog', { name: 'Sign out' });

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(theme).toBeFocused();
  await signOut.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
  await expect(dialog).toBeVisible();
  // Behind the modal dialog the trigger is out of the tree: read the attribute
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await signOut.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  // A visitor has no session to end: Sign out only closes the dialog
  await trigger.click();
  await signOut.click();
  await dialog.getByRole('button', { name: 'Sign out' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await inertElements(page)).toEqual([]);
});
