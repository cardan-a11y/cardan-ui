import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import {
  contrastRatio,
  focusStop,
  gotoHydrated,
  runAxe,
  tabKey,
} from './helpers';

/**
 * What happy-dom cannot show of ComboBox: focus and Tab, the list in the top
 * layer and its place, Escape inside a Dialog and a Popover, the pointer, the
 * contrast of the highlight and forced colors.
 */
test.beforeEach(async ({ page }) => {
  await gotoHydrated(page, '/combobox');
});

const topping = (page: Page) =>
  page.getByRole('combobox', { name: 'Topping' }).first();
const client = (page: Page) =>
  page.getByRole('combobox', { name: 'Client required' });

function listOf(page: Page) {
  return page.locator('.combobox-popup:popover-open');
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

/** The field and its open list, in viewport coordinates */
function boxes(combobox: Locator) {
  return combobox.evaluate((element) => {
    const field = element.closest('.combobox-control')!.getBoundingClientRect();
    const list = element
      .closest('.combobox-root')!
      .querySelector('.combobox-popup')!
      .getBoundingClientRect();
    return {
      field: { top: field.top, bottom: field.bottom },
      list: { top: list.top, bottom: list.bottom, width: list.width },
      fieldWidth: field.width,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

test('ComboBox in a Dialog: Escape closes the list, also on "no results", and a second Escape the dialog', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  const dialog = page.getByRole('dialog', { name: 'Choose a client' });
  const combobox = dialog.getByRole('combobox', { name: 'Client in a dialog' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(dialog.getByRole('listbox')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('listbox')).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(combobox).toBeFocused();

  await page.keyboard.type('zzz');
  await expect(listOf(page)).toHaveText('No options match your search');
  await page.keyboard.press('Escape');
  await expect(listOf(page)).toBeHidden();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('ComboBox in a modal Dialog: its options show over the dialog and take a click', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a client' });
  const combobox = dialog.getByRole('combobox', { name: 'Client in a dialog' });

  await combobox.click();
  const option = dialog.getByRole('option', { name: 'Belastingdienst' });
  await expectHittable(option);
  await option.click();

  await expect(combobox).toHaveValue('Belastingdienst');
  await expect(combobox).toBeFocused();
});

test('ComboBox in a Popover: its options show past the popover, and Escape closes the list before the popover', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Filters' }).click();
  const combobox = page.getByRole('combobox', { name: 'Filter by client' });
  await expect(combobox).toBeVisible();

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const list = listOf(page);
  await expect(list).toBeVisible();

  const popover = await combobox.evaluate((element) => {
    const box = element
      .closest('[popover]:not(.combobox-popup)')!
      .getBoundingClientRect();
    return { top: box.top, bottom: box.bottom };
  });
  const listBox = (await list.boundingBox())!;
  expect(
    listBox.y < popover.top || listBox.y + listBox.height > popover.bottom,
    'the list reaches past the popover',
  ).toBe(true);
  await page.keyboard.press('ArrowDown');
  await expectHittable(list.getByRole('option', { name: 'Acme' }));

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(combobox).toBeVisible();
  await expect(combobox).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(combobox).toBeHidden();
});

test('ComboBox in a container that hides its overflow: its options are not cut off', async ({
  page,
}) => {
  const combobox = page.getByRole('combobox', {
    name: 'In a container that clips',
  });

  await combobox.click();
  const list = listOf(page);
  await expect(list).toBeVisible();

  const option = list.getByRole('option', { name: 'Belastingdienst' });
  await expectHittable(option);
  await option.click();
  await expect(combobox).toHaveValue('Belastingdienst');
});

test('ComboBox: its list is as wide as the field, below it, and follows it when the page scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const combobox = topping(page);
  await combobox.evaluate((element) =>
    element.scrollIntoView({ block: 'center' }),
  );

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(listOf(page)).toBeVisible();

  const gap = async () => {
    const { field, list } = await boxes(combobox);
    return list.top - field.bottom;
  };

  const { fieldWidth, list } = await boxes(combobox);
  expect(Math.abs(list.width - fieldWidth)).toBeLessThan(1);
  expect(await gap()).toBeGreaterThanOrEqual(3);
  expect(await gap()).toBeLessThan(6);

  await page.mouse.wheel(0, 60);
  await expect.poll(gap).toBeGreaterThanOrEqual(3);
  await expect.poll(gap).toBeLessThan(6);
});

test('ComboBox near the bottom of the viewport opens upwards, its list within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const combobox = client(page);
  await combobox.evaluate((element) =>
    element.scrollIntoView({ block: 'end' }),
  );

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(listOf(page)).toBeVisible();

  await expect
    .poll(async () => {
      const { field, list } = await boxes(combobox);
      return list.bottom <= field.top && list.top >= 0;
    })
    .toBe(true);
});

test('ComboBox at 320 by 256 (400% zoom): the list stays in the viewport, a long label wraps with its checkmark in view', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 256 });
  const combobox = client(page);
  await combobox.evaluate((element) =>
    element.scrollIntoView({ block: 'center' }),
  );

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const list = listOf(page);
  await expect(list).toBeVisible();

  const { list: listBox, field, viewport } = await boxes(combobox);
  expect(listBox.top).toBeGreaterThanOrEqual(0);
  expect(listBox.bottom).toBeLessThanOrEqual(viewport.height);
  expect(
    listBox.top >= field.bottom || listBox.bottom <= field.top,
    'the list does not cover the field',
  ).toBe(true);
  expect(
    await list
      .getByRole('listbox')
      .evaluate((element) => element.scrollWidth > element.clientWidth),
    'the list scrolls sideways',
  ).toBe(false);

  // The selected option, highlighted by the first arrow key, is scrolled into view
  const selected = list.getByRole('option', { selected: true });
  await expect(selected).toBeInViewport({ ratio: 1 });
  await expect(selected.locator('.iconify')).toBeInViewport({ ratio: 1 });
});

test('ComboBox: the highlighted option is scrolled into view', async ({
  page,
}) => {
  const combobox = page.getByRole('combobox', { name: 'Client in a dialog' });
  await page.getByRole('button', { name: 'Open dialog' }).click();

  await combobox.focus();
  await page.keyboard.press('ArrowUp');
  const list = listOf(page);
  const last = list.getByRole('option', {
    name: 'Zorgverzekeraar Zilveren Kruis',
  });

  await expect(combobox).toHaveAttribute(
    'aria-activedescendant',
    (await last.getAttribute('id'))!,
  );
  await expect
    .poll(() =>
      last.evaluate((option) => {
        const box = option.getBoundingClientRect();
        const popup = option
          .closest('[role="listbox"]')!
          .getBoundingClientRect();
        // Half a pixel: Firefox rounds a scrolled box differently
        return box.top >= popup.top - 0.5 && box.bottom <= popup.bottom + 0.5;
      }),
    )
    .toBe(true);
});

test('ComboBox: focus selects the text, also by a click, Tab skips the open button, reaches the clear button and then leaves', async ({
  page,
}) => {
  const combobox = client(page);
  const selected = () =>
    combobox.evaluate(
      (input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!,
    );

  await combobox.focus();
  expect(await selected()).toBe('Gemeente Utrecht'.length);

  await page.keyboard.press(tabKey(page));
  await expect(
    page.getByRole('button', { name: 'Clear Client', exact: true }),
  ).toBeFocused();

  await page.keyboard.press(tabKey(page));
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();

  await combobox.click();
  expect(await selected()).toBe('Gemeente Utrecht'.length);
});

test('ComboBox: Tab from an emptied field, and from text that was not picked, lands on a control, never on the page', async ({
  page,
}) => {
  const combobox = client(page);

  await combobox.focus();
  await page.keyboard.press('Backspace');
  await page.keyboard.press(tabKey(page));
  expect((await focusStop(page)).onBody).toBe(false);
  await page.keyboard.press(tabKey(page));
  expect((await focusStop(page)).onBody).toBe(false);
  await expect(combobox).toHaveValue('');

  await combobox.focus();
  await page.keyboard.type('zzz');
  await page.keyboard.press(tabKey(page));
  expect((await focusStop(page)).onBody).toBe(false);
  await page.keyboard.press(tabKey(page));
  expect((await focusStop(page)).onBody).toBe(false);
  await expect(combobox).toHaveValue('');
});

test('ComboBox: clearing moves focus to the text field', async ({ page }) => {
  const combobox = client(page);

  await page.getByRole('button', { name: 'Clear Client', exact: true }).click();

  await expect(combobox).toHaveValue('');
  await expect(combobox).toBeFocused();
});

test('ComboBox: a pointer released outside an option or the clear button changes nothing', async ({
  page,
}) => {
  const combobox = client(page);
  await combobox.click();
  const option = listOf(page).getByRole('option', { name: 'Acme' });
  const optionBox = (await option.boundingBox())!;

  await page.mouse.move(optionBox.x + 20, optionBox.y + optionBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(5, 5);
  await page.mouse.up();

  await expect(combobox).toHaveValue('Gemeente Utrecht');
  await page.keyboard.press('Escape');

  const clear = page.getByRole('button', { name: 'Clear Client', exact: true });
  const clearBox = (await clear.boundingBox())!;
  await page.mouse.move(
    clearBox.x + clearBox.width / 2,
    clearBox.y + clearBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(5, 5);
  await page.mouse.up();

  await expect(combobox).toHaveValue('Gemeente Utrecht');
});

test('ComboBox: hover leaves the highlight where the arrow keys put it', async ({
  page,
}) => {
  const combobox = topping(page);
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  const active = await combobox.getAttribute('aria-activedescendant');

  await listOf(page).getByRole('option', { name: 'Olives' }).hover();

  await expect(combobox).toHaveAttribute('aria-activedescendant', active!);
});

test('ComboBox: dragging the scrollbar of the list keeps it open and focus in the text field', async ({
  page,
}) => {
  const combobox = client(page);
  await combobox.focus();
  await page.keyboard.press('ArrowDown', { delay: 10 });
  const list = listOf(page);
  const box = (await list.boundingBox())!;

  await page.mouse.move(box.x + box.width - 4, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + 90);
  await page.mouse.up();

  await expect(list).toBeVisible();
  await expect(combobox).toBeFocused();
});

test('ComboBox: after a pan in the list, focus can leave the field', async ({
  page,
}) => {
  const combobox = client(page);
  await combobox.focus();
  await page.keyboard.press('ArrowDown', { delay: 10 });
  const list = listOf(page);

  // A touch pan ends in pointercancel, not pointerup
  await list.dispatchEvent('pointerdown');
  await list.dispatchEvent('pointercancel');
  await page.keyboard.press('Shift+Tab');

  await expect(combobox).not.toBeFocused();
});

test('ComboBox: Enter with the list open picks and does not submit; with it closed it submits', async ({
  page,
}) => {
  const combobox = client(page);
  const submitted = page.getByText('Submitted:');

  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(combobox).toHaveValue('Hogeschool van Arnhem en Nijmegen');
  await expect(submitted).toBeHidden();

  await page.keyboard.press('Enter');
  await expect(submitted).toContainText('{"client_id":"8"}');
});

test('ComboBox: Enter after text that was not picked submits the value the field shows again', async ({
  page,
}) => {
  const combobox = client(page);

  await combobox.focus();
  await page.keyboard.type('acm');
  await page.keyboard.press('Enter');
  await expect(listOf(page)).toBeHidden();
  await page.keyboard.press('Enter');

  await expect(combobox).toHaveValue('Gemeente Utrecht');
  await expect(page.getByText('Submitted:')).toContainText('{"client_id":"7"}');
});

test('ComboBox: Enter in an emptied required field fails the submit with focus in the field', async ({
  page,
}) => {
  const combobox = client(page);

  await combobox.focus();
  await page.keyboard.press('Backspace');
  await expect(combobox).toHaveValue('');
  // The first Enter closes the list the edit opened, the second submits
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Submitted:')).toBeHidden();
  await expect(combobox).toHaveAttribute('aria-invalid', 'true');
  await expect(combobox).toBeFocused();
});

test('ComboBox with server-search: typing asks the server once, and the scroll and Down Arrow load the next page', async ({
  page,
}) => {
  const combobox = page.getByRole('combobox', {
    name: 'Client, searched on the server',
  });
  const list = listOf(page);
  const options = list.getByRole('option');

  await expect(combobox).toHaveValue('Océ');
  await combobox.click();
  await expect(options).toHaveCount(8);
  await expect(options.first()).toHaveAttribute('aria-setsize', '-1');

  // The end of the list in view asks for the next page
  await list.getByRole('listbox').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(options).toHaveCount(16);
  await expect(page.getByText('"", page 2')).toBeVisible();
  await expect(combobox).not.toHaveAttribute('aria-activedescendant');

  // Down Arrow on the last loaded option asks too, and does not wrap
  await options.last().scrollIntoViewIfNeeded();
  await page.keyboard.press('ArrowDown');
  for (let step = 0; step < 4; step++) await page.keyboard.press('ArrowDown');
  await expect(options).toHaveCount(20);
  await expect(page.getByText('"", page 3')).toBeVisible();
  await expect(options.first()).not.toHaveAttribute('aria-setsize');

  await page.keyboard.type('gem');
  await expect(options).toHaveText([
    'Gemeente Amsterdam',
    'Gemeente Rotterdam',
    'Gemeente Utrecht',
  ]);
  await expect(page.getByText('"gem", page 1')).toBeVisible();
  await expect(page.getByText('"g", page 1')).toBeHidden();

  await options.nth(2).click();
  await expect(combobox).toHaveValue('Gemeente Utrecht');
  await expect(page.getByText('Value: 7').last()).toBeVisible();
});

test('ComboBox: Tab to the clear button closes the list', async ({ page }) => {
  const combobox = client(page);
  await combobox.click();
  await expect(listOf(page)).toBeVisible();

  await page.keyboard.press(tabKey(page));

  await expect(
    page.getByRole('button', { name: 'Clear Client', exact: true }),
  ).toBeFocused();
  await expect(listOf(page)).toBeHidden();
});

for (const mode of [
  { name: 'light', colorScheme: 'light' },
  { name: 'dark', colorScheme: 'dark' },
] as const) {
  test.describe(`${mode.name} mode`, () => {
    test.use({ colorScheme: mode.colorScheme });

    test('ComboBox: the highlight and the checkmark reach 3:1 against the option, and axe passes with the list open', async ({
      page,
    }) => {
      const combobox = client(page);
      await combobox.focus();
      await page.keyboard.press('ArrowDown');
      await expect(listOf(page)).toBeVisible();

      const colors = await listOf(page).evaluate((popup) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const rgb = (color: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
        };
        const option = popup.querySelector('.is-highlighted')!;
        const icon = option.querySelector('.iconify')!;

        return {
          background: rgb(getComputedStyle(popup).backgroundColor),
          outline: rgb(getComputedStyle(option).outlineColor),
          outlineWidth: getComputedStyle(option).outlineWidth,
          checkmark: rgb(getComputedStyle(icon).color),
        };
      });

      expect(colors.outlineWidth).toBe('2px');
      expect(
        contrastRatio(colors.outline, colors.background),
      ).toBeGreaterThanOrEqual(3);
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

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('ComboBox: the outline of the highlight and the checkmark show', async ({
    page,
  }) => {
    const combobox = client(page);
    await combobox.focus();
    await page.keyboard.press('ArrowDown');
    await expect(listOf(page)).toBeVisible();

    const painted = await listOf(page).evaluate((popup) => {
      const option = popup.querySelector('.is-highlighted')!;
      const icon = option.querySelector('.iconify')!;

      return {
        background: getComputedStyle(popup).backgroundColor,
        outlineStyle: getComputedStyle(option).outlineStyle,
        outline: getComputedStyle(option).outlineColor,
        // The icon is a mask over its background
        checkmark: getComputedStyle(icon).backgroundColor,
      };
    });

    expect(painted.outlineStyle).toBe('solid');
    expect(painted.outline).not.toBe(painted.background);
    expect(painted.checkmark).not.toBe(painted.background);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('ComboBox: a tap on the open button opens the list, with focus in the text field', async ({
    page,
  }) => {
    const combobox = topping(page);

    await page
      .getByRole('button', { name: 'Topping', exact: true })
      .first()
      .tap();

    await expect(listOf(page)).toBeVisible();
    await expect(combobox).toBeFocused();

    await listOf(page).getByRole('option', { name: 'Olives' }).tap();
    await expect(combobox).toHaveValue('Olives');
  });
});
