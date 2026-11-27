import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
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

test('DatePicker: Tab from an empty field moves into the open calendar, which stays open', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'DatePicker' });
  await expect(combobox).toHaveValue('');

  await combobox.focus();
  await page.keyboard.press('Enter');
  const calendar = page.locator(
    `#${await combobox.getAttribute('aria-controls')}`,
  );
  await expect(calendar).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(calendar).toBeVisible();
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');
  expect(
    await calendar.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
});

for (const key of ['Escape', 'Shift+Tab']) {
  test(`DatePicker: ${key} in the calendar closes it with focus on the field`, async ({
    page,
  }) => {
    await gotoHydrated(page, '/form');
    const combobox = page.getByRole('combobox', { name: 'DatePicker' });

    await combobox.focus();
    await page.keyboard.press('Enter');
    const calendar = page.locator(
      `#${await combobox.getAttribute('aria-controls')}`,
    );
    await page.keyboard.press('Tab');
    await expect(calendar).toBeFocused();

    await page.keyboard.press(key);
    await expect(calendar).toBeHidden();
    await expect(combobox).toBeFocused();
  });
}

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

test('DatePicker: text that arrives without a key, as from a paste or autofill, is read as a date', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const combobox = page.getByRole('combobox', { name: 'DatePicker' });

  await combobox.fill('2026-03-15');
  await combobox.blur();
  await expect(combobox).toHaveValue('2026-03-15');

  await combobox.click();
  await expect(
    page.getByRole('gridcell', { selected: true }).filter({ hasText: /^15$/ }),
  ).toBeVisible();
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

function coveredCorners(calendar: Locator) {
  return calendar.evaluate((el) => {
    const { left, right, top, bottom } = el.getBoundingClientRect();
    return [
      [left + 2, top + 2],
      [right - 2, top + 2],
      [left + 2, bottom - 2],
      [right - 2, bottom - 2],
    ].filter(([x, y]) => !el.contains(document.elementFromPoint(x!, y!)));
  });
}

async function againstField(calendar: Locator, combobox: Locator) {
  return calendar.evaluate((el, field) => {
    const cal = el.getBoundingClientRect();
    const { top, bottom } = field!.getBoundingClientRect();
    const gap = cal.top >= bottom ? cal.top - bottom : top - cal.bottom;
    return gap >= 0 && gap < 16;
  }, await combobox.elementHandle());
}

async function openCalendar(page: Page, combobox: Locator) {
  await combobox.focus();
  await page.keyboard.press('Enter');
  const calendar = page.locator(
    `#${await combobox.getAttribute('aria-controls')}`,
  );
  await expect(calendar).toBeVisible();
  return calendar;
}

const places = {
  'on a page': {
    url: '/form',
    name: 'DatePicker',
    setup: async () => {},
  },
  'in a Popover': {
    url: '/tooltip',
    name: 'From',
    setup: (page: Page) =>
      page.getByRole('button', { name: 'Filters' }).click(),
  },
};

for (const [where, { url, name, setup }] of Object.entries(places)) {
  test(`DatePicker ${where}: the calendar shows whole and stays against its field when the page scrolls`, async ({
    page,
  }) => {
    await gotoHydrated(page, url);
    await setup(page);
    const combobox = page.getByRole('combobox', { name });
    const calendar = await openCalendar(page, combobox);
    await expect.poll(() => coveredCorners(calendar)).toEqual([]);
    await expect.poll(() => againstField(calendar, combobox)).toBe(true);

    const scrollY = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 120);
    await page.waitForFunction((y) => window.scrollY !== y, scrollY);
    await expect(calendar).toBeVisible();
    await expect.poll(() => againstField(calendar, combobox)).toBe(true);
  });
}

for (const position of ['left', 'center', 'right', 'top', 'bottom']) {
  test(`DatePicker in a Dialog (${position}): the calendar shows whole, against its field`, async ({
    page,
  }) => {
    await gotoHydrated(page, '/dialog');
    await page
      .getByRole('button', { name: `Open dialog ${position}` })
      .click();
    const combobox = page
      .getByRole('dialog', { name: 'Dialog title' })
      .getByRole('combobox', { name: 'DatePicker' });

    const calendar = await openCalendar(page, combobox);
    await expect.poll(() => coveredCorners(calendar)).toEqual([]);
    await expect.poll(() => againstField(calendar, combobox)).toBe(true);
  });
}
