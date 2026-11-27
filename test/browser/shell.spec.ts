import { expect, test } from './test';
import { focusStop, gotoHydrated, inertElements } from './helpers';

test('SkipLink: the first Tab stop, in view when focused, moves focus to main', async ({
  page,
}) => {
  await gotoHydrated(page, '/buttons');
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skipLink).not.toBeInViewport();

  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport({ ratio: 1 });

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('MobileMenu: after a link in it, focus is at the top of the new page, not on the Menu button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await gotoHydrated(page, '/buttons');
  const menuButton = page
    .getByRole('banner')
    .getByRole('button', { name: 'Menu', exact: true });
  const menu = page.getByRole('dialog', { name: 'Mobile menu' });

  await menuButton.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();

  await menu.getByRole('link', { name: 'Colors', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/colors$/);
  await expect(menu).toBeHidden();

  await expect.poll(async () => (await focusStop(page)).onBody).toBe(false);
  await expect(menuButton).not.toBeFocused();
  expect(await inertElements(page)).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeFocused();
});

test('Dialog: after a link in it that closes it, focus is at the top of the new page, not on its opener', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open search dialog' });
  const dialog = page.getByRole('dialog', { name: 'Search results' });

  await trigger.click();
  await expect(dialog).toBeVisible();

  await dialog.getByRole('link', { name: 'Search result' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/dialog\/results$/);
  await expect(dialog).toBeHidden();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        return (
          !!active &&
          active !== document.body &&
          active.contains(document.getElementById('main'))
        );
      }),
    )
    .toBe(true);
  await expect(trigger).not.toBeFocused();
  expect(await inertElements(page)).toEqual([]);
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to main content' }),
  ).toBeFocused();
});
