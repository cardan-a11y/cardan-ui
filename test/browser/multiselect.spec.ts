/**
 * MultiSelect's Escape (APG combobox): Escape closes the listbox and focus
 * stays on the combobox. @vueform/multiselect blurs itself on Escape, which
 * dropped focus on the body; the wrapper keeps it. With the listbox closed,
 * Escape goes on to what is around the field, such as a Dialog.
 */
import { expect, test } from '@playwright/test';
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
