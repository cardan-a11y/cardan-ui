import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('DatePicker: Enter opens the calendar, Escape closes it with focus on the field', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'DatePicker' });

  await combobox.focus();
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');

  await page.keyboard.press('Enter');
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');
  const calendar = page.locator(
    `#${await combobox.getAttribute('aria-controls')}`,
  );
  await expect(calendar).toBeVisible();
  await expect(calendar).toHaveAttribute('role', 'dialog');

  await page.keyboard.press('Escape');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await expect(calendar).toBeHidden();
  await expect(combobox).toBeFocused();
});

test('DatePicker: a day picked in the calendar fills the field, the clear button empties it', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'DatePicker' });

  await combobox.click();
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('gridcell').filter({ hasText: /^15$/ }).first().click();

  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await expect(combobox).toHaveValue(/^\d{4}-\d{2}-15$/);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(combobox).toHaveValue('');
});

test('DatePicker in a Dialog: Escape closes the calendar first, then the dialog', async ({
  page,
}) => {
  await gotoHydrated(page, '/dialog');
  const trigger = page.getByRole('button', { name: 'Open dialog center' });
  const dialog = page.getByRole('dialog', { name: 'Dialog title' });
  const combobox = dialog.getByRole('combobox', { name: 'DatePicker' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await combobox.focus();
  await page.keyboard.press('Enter');
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
