/**
 * MultiSelect's Escape (APG combobox): Escape closes the listbox and focus
 * stays on the combobox. @vueform/multiselect blurs itself on Escape, which
 * dropped focus on the body; the wrapper keeps it. With the listbox closed,
 * Escape goes on to what is around the field, such as a Dialog.
 *
 * Its listbox is fixed to the field, in the top layer: a container that
 * scrolls, hides its overflow or is transformed does not cut it off, and it
 * follows the field when the page scrolls.
 */
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

  // Escape on the closed field leaves focus where it is too
  await page.keyboard.press('Escape');
  await expect(combobox).toBeFocused();

  // And the arrow opens it again from there
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

/** The listbox the combobox controls */
async function listboxOf(page: Page, combobox: Locator) {
  const id = await combobox.getAttribute('aria-controls');
  return page.locator(`[id="${id}"]`);
}

/** What a pointer at the centre of the option hits is the option itself */
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

  // The popover is only as high as the field: the list reaches past it
  const popoverBottom = await combobox.evaluate(
    (element) => element.closest('[popover]')!.getBoundingClientRect().bottom,
  );
  const listboxBox = (await listbox.boundingBox())!;
  expect(listboxBox.y + listboxBox.height).toBeGreaterThan(popoverBottom);

  const options = listbox.getByRole('option');
  for (const option of await options.all()) await expectHittable(option);

  await listbox.getByRole('option', { name: 'Longer text option 2' }).click();
  // Named by the selection, then its label; the click was inside the popover,
  // which stays open
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

  // The container ends at the field's bottom edge
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
      // Below the field or above it, whichever side it opened to
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
