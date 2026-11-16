/**
 * Components inside other components, as the Auditor uses them: a Popover
 * in a table row, a MultiSelect and a DatePicker in a Dialog. Each layer
 * keeps to its own keys: Escape closes the innermost popup first, Tab stays
 * in the dialog while a popup in it is open.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { focusWalk, gotoHydrated } from './helpers';

test('Popover in a table row: opens on top of the table, Escape returns focus, Tab past the end closes', async ({
  page,
}) => {
  await gotoHydrated(page, '/table');
  const trigger = page.getByRole('button', { name: 'Actions for 1.1.1' });
  const menu = page.getByRole('navigation', { name: 'Actions for 1.1.1' });
  const edit = menu.getByRole('button', { name: 'Edit' });

  await trigger.click();
  await expect(edit).toBeFocused();
  // Not cut off by the table's scroll container: in the top layer
  await expect(menu).toBeInViewport({ ratio: 1 });

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  // The next row's trigger
  await expect(
    page.getByRole('button', { name: 'Actions for 1.2.1' }),
  ).toBeFocused();
});

/** The dialog of /dialog, open */
async function openDialog(page: Page) {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog center' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Escape closes the popup, a second Escape the dialog, and focus goes back
 * to the dialog's trigger
 */
async function expectEscapeInsideOut(
  page: Page,
  dialog: Locator,
  popup: Locator,
) {
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open dialog center' }),
  ).toBeFocused();
}

/** Tab and Shift+Tab while the popup is open: where focus goes */
async function tabAround(page: Page, dialog: Locator) {
  const stops = [];
  for (const reverse of [false, true]) {
    stops.push(...(await focusWalk(page, 12, { reverse, within: dialog })));
  }
  return stops;
}

/** The popups of /dialog's form fields, opened from the keyboard */
const popups = {
  MultiSelect: async (page: Page, dialog: Locator) => {
    await dialog.getByRole('combobox', { name: 'MultiSelect' }).focus();
    await page.keyboard.press('ArrowDown');
    return dialog.getByRole('listbox');
  },
  DatePicker: async (page: Page, dialog: Locator) => {
    await dialog.getByRole('combobox', { name: 'DatePicker' }).focus();
    await page.keyboard.press('Enter');
    // The calendar is a dialog of its own, inside the Dialog
    return dialog.getByRole('dialog');
  },
};

for (const [name, open] of Object.entries(popups)) {
  test(`${name} in a Dialog: Escape closes its popup first, then the dialog`, async ({
    page,
  }) => {
    const dialog = await openDialog(page);
    const popup = await open(page, dialog);
    await expect(popup).toBeVisible();

    await expectEscapeInsideOut(page, dialog, popup);
  });

  test(`${name} in a Dialog: Tab stays in the dialog while its popup is open`, async ({
    page,
  }) => {
    const dialog = await openDialog(page);
    await expect(await open(page, dialog)).toBeVisible();

    const stops = await tabAround(page, dialog);
    expect(stops.filter((stop) => !stop.inside && !stop.onBody)).toEqual([]);
  });

  test(`${name} in a Dialog: Tab through its open popup never drops focus`, async ({
    page,
  }) => {
    // Defect of @vuepic/vue-datepicker 14 (its menu keydown handler,
    // `tabOutClosesMenu`): Shift+Tab on the calendar's own focusable
    // container (`.dp--menu`, "Datepicker menu") cancels the Tab and closes
    // the calendar without moving focus, so focus falls to the body when the
    // menu leaves the DOM after its transition; the next Tab reaches the
    // input. Only the timing of that removal against the walk's reading is
    // intermittent. Focusing the input on the library's `closed` does not
    // fix it: `closed` can fire on a Tab from the input while the calendar
    // stays shown, and then not again when this Shift+Tab hides it. Skipped
    // until then: as a failing test it would pass and fail by turns.
    test.fixme(
      name === 'DatePicker',
      'Tab out of the DatePicker calendar can drop focus on the body',
    );

    const dialog = await openDialog(page);
    await expect(await open(page, dialog)).toBeVisible();

    const stops = await tabAround(page, dialog);
    expect(stops.filter((stop) => stop.onBody)).toEqual([]);
  });
}
