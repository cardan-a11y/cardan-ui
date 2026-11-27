import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
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
  await expect(menu).toBeInViewport({ ratio: 1 });

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menu).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Actions for 1.2.1' }),
  ).toBeFocused();
});

async function openDialog(page: Page) {
  await gotoHydrated(page, '/dialog');
  await page.getByRole('button', { name: 'Open dialog center' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function expectEscapeInsideOut(
  page: Page,
  dialog: Locator,
  popup: Locator,
  field: Locator,
) {
  await page.keyboard.press('Escape');
  await expect(popup).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open dialog center' }),
  ).toBeFocused();
}

async function tabAround(page: Page, dialog: Locator) {
  const stops = [];
  for (const reverse of [false, true]) {
    stops.push(...(await focusWalk(page, 12, { reverse, within: dialog })));
  }
  return stops;
}

const popupsOpenedByKeyboard = {
  MultiSelect: async (page: Page, dialog: Locator) => {
    await dialog.getByRole('combobox', { name: 'MultiSelect' }).focus();
    await page.keyboard.press('ArrowDown');
    return dialog.getByRole('listbox');
  },
  DatePicker: async (page: Page, dialog: Locator) => {
    await dialog.getByRole('combobox', { name: 'DatePicker' }).focus();
    await page.keyboard.press('Enter');
    return dialog.getByRole('dialog');
  },
};

for (const [name, open] of Object.entries(popupsOpenedByKeyboard)) {
  test(`${name} in a Dialog: Escape closes its popup first, then the dialog`, async ({
    page,
  }) => {
    const dialog = await openDialog(page);
    const popup = await open(page, dialog);
    await expect(popup).toBeVisible();

    await expectEscapeInsideOut(
      page,
      dialog,
      popup,
      dialog.getByRole('combobox', { name }),
    );
  });

  test(`${name} in a Dialog: Tab stays in the dialog while its popup is open, and never drops focus`, async ({
    page,
  }) => {
    const dialog = await openDialog(page);
    await expect(await open(page, dialog)).toBeVisible();

    const stops = await tabAround(page, dialog);
    expect(stops.filter((stop) => !stop.inside || stop.onBody)).toEqual([]);
  });
}
