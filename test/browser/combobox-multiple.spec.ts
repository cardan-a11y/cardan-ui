import { expect, test, type Page } from '@playwright/test';
import { contrastRatio, gotoHydrated, runAxe, tabKey } from './helpers';

/**
 * What happy-dom cannot show of ComboBox with `multiple`: focus moving into the dialog
 * and back, Tab through the checkboxes and out, Escape inside a Dialog, the
 * pointer, the place of the list at 400% zoom, and the three findings of the
 * Auditor's report its first version closes (F36 name and description, F7
 * not by colour alone, F13 reflow).
 */
test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/combobox-multiple');
});

const statuses = (page: Page) =>
  page.getByRole('combobox', { name: 'Statuses to show required' });
const findings = (page: Page) =>
  page.getByRole('combobox', { name: 'Default findings' }).first();

function popupOf(page: Page) {
  return page.locator('.combobox.is-multiple .combobox-popup:popover-open');
}

test('ComboBox multiple: Down Arrow moves focus into the dialog, Space ticks, Escape returns to the field', async ({
  page,
}) => {
  const combobox = statuses(page);
  const dialog = page.getByRole('dialog', { name: 'Statuses to show' });

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'To do' })).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(
    dialog.getByRole('checkbox', { name: 'In progress' }),
  ).toBeChecked();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(combobox).toBeFocused();
  await expect(combobox).toHaveValue('In progress');
});

test('ComboBox multiple: Tab goes through the checkboxes of the open dialog, and past the last one leaves and closes it', async ({
  page,
}) => {
  const combobox = statuses(page);

  await combobox.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(popupOf(page)).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'To do' })).toBeFocused();
  for (let step = 0; step < 5; step++) await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Completed' })).toBeFocused();

  await page.keyboard.press(tabKey(page));
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  await expect(popupOf(page)).toBeHidden();
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
});

test('ComboBox multiple: Enter on a checkbox and in the field does not submit while the dialog is open', async ({
  page,
}) => {
  const combobox = statuses(page);

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Submitted:')).toBeHidden();

  await page.keyboard.press('ArrowUp');
  await expect(combobox).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(popupOf(page)).toBeHidden();
  await expect(page.getByText('Submitted:')).toBeHidden();

  await page.keyboard.press('Enter');
  await expect(page.getByText('Submitted: ["todo"]')).toBeVisible();
});

test('ComboBox multiple: a click on an option ticks it, keeps the dialog open and focus in the field', async ({
  page,
}) => {
  const combobox = statuses(page);

  await combobox.click();
  await page.getByText('On hold', { exact: true }).click();
  await page.getByText('Cancelled', { exact: true }).click();

  await expect(page.getByRole('checkbox', { name: 'On hold' })).toBeChecked();
  await expect(popupOf(page)).toBeVisible();
  await expect(combobox).toBeFocused();

  await combobox.selectText();
  await page.keyboard.type('comp');
  await expect(popupOf(page).getByRole('checkbox')).toHaveCount(1);
  await expect(popupOf(page)).toContainText('2 selected');

  await page.getByRole('heading', { name: 'In a form' }).click();
  await expect(popupOf(page)).toBeHidden();
  await expect(combobox).toHaveValue('2 selected');
});

test('ComboBox multiple: a click on a label keeps the search and its caret, so typing goes on', async ({
  page,
}) => {
  const combobox = statuses(page);

  await combobox.click();
  await page.keyboard.type('o');
  await page.getByText('On hold', { exact: true }).click();
  await page.keyboard.type('n');

  await expect(combobox).toHaveValue('on');
  await expect(page.getByRole('checkbox', { name: 'On hold' })).toBeChecked();
});

test('ComboBox multiple in a Dialog: Escape in the list closes only the list, a second Escape the dialog', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  const dialog = page.getByRole('dialog', { name: 'Connect findings' });
  const combobox = dialog.getByRole('combobox', { name: 'Default findings' });

  await trigger.click();
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(popupOf(page)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(popupOf(page)).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('ComboBox multiple (F36): the field and the dialog are named by the label alone, the instruction describes the field', async ({
  page,
}) => {
  const combobox = findings(page);

  await expect(combobox).toHaveValue('2 selected');
  await expect(combobox).toHaveAccessibleName('Default findings');
  await expect(combobox).toHaveAccessibleDescription(
    'The findings are added to every page of the test.',
  );

  await combobox.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(
    page.getByRole('dialog', { name: 'Default findings', exact: true }),
  ).toBeVisible();
});

test('ComboBox multiple (F13) at 320 by 256 (400% zoom): the list stays in the viewport and scrolls down, never sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  const combobox = findings(page);
  await combobox.evaluate((element) =>
    element.scrollIntoView({ block: 'center' }),
  );

  await combobox.focus();
  await page.keyboard.press('Alt+ArrowDown');
  const popup = popupOf(page);
  // The playground's function answers after 800ms
  await expect(popup.getByRole('checkbox').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');

  const box = await popup.evaluate((element) => {
    const { top, bottom, left, right } = element.getBoundingClientRect();
    const list = element.querySelector('ul')!;
    return {
      top,
      bottom,
      left,
      right,
      sideways: list.scrollWidth > list.clientWidth,
      down: list.scrollHeight > list.clientHeight,
      page: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.bottom).toBeLessThanOrEqual(256);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.right).toBeLessThanOrEqual(320);
  expect(box.sideways, 'the list scrolls sideways').toBe(false);
  expect(box.down, 'the list scrolls down').toBe(true);
  expect(box.page, 'the page scrolls sideways').toBe(false);

  // A long label wraps beside its checkbox, which stays in view
  await page.keyboard.press('End');
  const long = page.getByRole('checkbox', {
    name: 'Dragging is the only way to sort the list',
  });
  await expect(long).toBeFocused();
  await expect(long).toBeInViewport({ ratio: 1 });
});

for (const mode of [
  { name: 'light', colorScheme: 'light' },
  { name: 'dark', colorScheme: 'dark' },
] as const) {
  test.describe(`${mode.name} mode`, () => {
    test.use({ colorScheme: mode.colorScheme });

    test('ComboBox multiple (F7): a ticked option shows its checkmark, the focus outline reaches 3:1, axe passes with the dialog open', async ({
      page,
    }) => {
      const combobox = statuses(page);
      await combobox.focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');

      const colors = await popupOf(page).evaluate((popup) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const rgb = (color: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
        };
        const row = popup.querySelector('.combobox-check')!;
        const box = row.querySelector('input')!;

        return {
          background: rgb(getComputedStyle(popup).backgroundColor),
          outline: rgb(getComputedStyle(row).outlineColor),
          outlineWidth: getComputedStyle(row).outlineWidth,
          checkmark: rgb(getComputedStyle(box, '::after').backgroundColor),
          checkmarkShown: getComputedStyle(box, '::after').content !== 'none',
        };
      });

      expect(colors.outlineWidth).toBe('2px');
      expect(
        contrastRatio(colors.outline, colors.background),
      ).toBeGreaterThanOrEqual(3);
      expect(colors.checkmarkShown).toBe(true);
      expect(
        contrastRatio(colors.checkmark, colors.background),
      ).toBeGreaterThanOrEqual(3);

      const violations = await runAxe(page);
      expect(
        violations
          .filter((violation) => /combobox/.test(violation.target))
          .map((v) => `${v.rule} ${v.target}: ${v.summary}`),
      ).toEqual([]);
    });
  });
}
