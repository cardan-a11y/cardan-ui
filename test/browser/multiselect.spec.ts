import { expect, test, type Locator, type Page } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('MultiSelect: Escape closes the listbox, focus stays on the combobox', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'MultiSelect' });

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

test('MultiSelect in a Dialog: Escape closes the listbox with focus on the combobox, a second Escape the dialog', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog center' });
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  const combobox = dialog.getByRole('combobox', { name: 'MultiSelect' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('listbox')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('listbox')).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
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

test('MultiSelect in a Popover: its options show past the popover and take a click', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  await page.getByRole('button', { name: 'Filters' }).click();
  const combobox = page.getByRole('combobox', {
    name: 'MultiSelect in a popover',
  });
  await expect(combobox).toBeVisible();

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = await listboxOf(page, combobox);
  await expect(listbox).toBeVisible();

  const popoverBottom = await combobox.evaluate(
    (element) => element.closest('[popover]')!.getBoundingClientRect().bottom,
  );
  const listboxBox = (await listbox.boundingBox())!;
  expect(listboxBox.y + listboxBox.height).toBeGreaterThan(popoverBottom);

  const options = listbox.getByRole('option');
  for (const option of await options.all()) await expectHittable(option);

  await listbox.getByRole('option', { name: 'Longer text option 2' }).click();
  await expect(
    page.getByRole('combobox', {
      name: /^Longer text option 2.*MultiSelect in a popover$/,
    }),
  ).toBeVisible();
});

test('MultiSelect in a transformed container that hides its overflow: its options are not cut off', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'MultiSelect' });

  await combobox.evaluate((element) => {
    const field = element.closest('.multiselect')!;
    const container = field.closest('section')!;
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
  await listbox.getByRole('option', { name: 'Long option 1' }).click();
  await expect(
    page.getByRole('combobox', { name: /^Long option 1.*MultiSelect$/ }),
  ).toBeVisible();
});

test('MultiSelect: its open listbox follows the field when the page scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'MultiSelect' });
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
  const combobox = page.getByRole('combobox', { name: 'MultiSelect' });
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
