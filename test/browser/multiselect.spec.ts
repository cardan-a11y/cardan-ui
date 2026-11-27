import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

test('MultiSelect: Escape closes the listbox, focus stays on the combobox', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: /WCAG level filter$/ });

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(combobox).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');
});

async function listboxOf(page: Page, combobox: Locator) {
  const id = await combobox.getAttribute('aria-controls');
  return page.locator(`[id="${id}"]`);
}

async function expectHittable(option: Locator) {
  await expect
    .poll(() =>
      option.evaluate((element) => {
        const { left, top, width, height } = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          left + width / 2,
          top + height / 2,
        );
        return !!hit && element.contains(hit);
      }),
    )
    .toBe(true);
}

test('MultiSelect in a transformed container that hides its overflow: its options are not cut off', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: /WCAG level filter$/ });

  await combobox.evaluate((element) => {
    const field = element.closest('.multiselect')!;
    const container = field.parentElement!;
    const height =
      field.getBoundingClientRect().bottom -
      container.getBoundingClientRect().top;
    Object.assign(container.style, {
      overflow: 'hidden',
      transform: 'translateX(0)',
      maxHeight: `${height}px`,
    });
  });

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = await listboxOf(page, combobox);
  await expect(listbox).toBeVisible();

  for (const option of await listbox.getByRole('option').all()) {
    await expectHittable(option);
  }
  await listbox.getByRole('option', { name: 'Level AAA' }).click();
  await expect(combobox).toHaveAccessibleName(/Level AAA/);
});

test('MultiSelect: its open listbox follows the field when the page scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: /WCAG level filter$/ });
  await combobox.evaluate((element) =>
    element.closest('.multiselect')!.scrollIntoView({ block: 'center' }),
  );

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = await listboxOf(page, combobox);
  await expect(listbox).toBeVisible();

  const id = await combobox.getAttribute('aria-controls');
  const gap = () =>
    combobox.evaluate((element, id) => {
      const field = element.closest('.multiselect')!.getBoundingClientRect();
      const list = document.getElementById(id!)!.getBoundingClientRect();
      return Math.min(
        Math.abs(list.top - field.bottom),
        Math.abs(field.top - list.bottom),
      );
    }, id);

  expect(await gap()).toBeLessThan(4);
  await page.mouse.wheel(0, 60);
  await expect.poll(gap).toBeLessThan(4);
});

test('MultiSelect in a modal Dialog: its options show over the dialog and take a click', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog center' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  await expect(dialog).toBeVisible();
  const combobox = dialog.getByRole('combobox', { name: 'MultiSelect' });

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = await listboxOf(page, combobox);
  await expect(listbox).toBeVisible();

  const option = listbox.getByRole('option', {
    name: 'Lorem ipsum test long text',
  });
  await expectHittable(option);
  await option.click();
  await expect(
    dialog.getByRole('combobox', {
      name: /^Lorem ipsum test long text.*MultiSelect$/,
    }),
  ).toBeVisible();
});

test('MultiSelect near the bottom of the viewport opens upwards, its listbox within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: /WCAG level filter$/ });
  // The last field on /form: scrolled to the bottom edge of the viewport
  await combobox.evaluate((element) =>
    element.closest('.multiselect')!.scrollIntoView({ block: 'end' }),
  );

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = await listboxOf(page, combobox);
  await expect(listbox).toBeVisible();
  const id = await combobox.getAttribute('aria-controls');

  await expect
    .poll(() =>
      combobox.evaluate((element, id) => {
        const field = element.closest('.multiselect')!.getBoundingClientRect();
        const list = document.getElementById(id!)!.getBoundingClientRect();
        return (
          list.bottom <= field.top + 4 &&
          list.top >= 0 &&
          list.bottom <= window.innerHeight
        );
      }, id),
    )
    .toBe(true);
});
