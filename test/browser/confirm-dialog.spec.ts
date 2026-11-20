import { expect, test, type Page } from '@playwright/test';
import {
  focusStop,
  focusWalk,
  gotoHydrated,
  inertElements,
  runAxe,
} from './helpers';

/** The page's status line with a result; other components have a status too */
const result = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text });

/** Resolves once the open dialog has faded in: axe reads colours mid-fade */
const opened = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('dialog[open]')].flatMap((dialog) =>
        dialog.getAnimations({ subtree: true }).map((a) => a.finished),
      ),
    ).then(() => undefined),
  );

test('ConfirmDialog: focus starts on Cancel, Tab stays inside, Cancel returns focus', async ({
  page,
}) => {
  await gotoHydrated(page, '/confirm-dialog');
  const trigger = page.getByRole('button', { name: 'Delete the report' });
  const dialog = page.getByRole('alertdialog', { name: 'Delete the report?' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

  for (const reverse of [false, true]) {
    const stops = await focusWalk(page, 8, { reverse, within: dialog });
    expect(stops.filter((stop) => !stop.inside)).toEqual([]);
  }

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(result(page, 'Plain: cancelled')).toBeVisible();
  expect(await inertElements(page)).toEqual([]);
});

test('ConfirmDialog: Escape cancels and returns focus', async ({ page }) => {
  await gotoHydrated(page, '/confirm-dialog');
  const trigger = page.getByRole('button', { name: 'Delete the report' });
  const dialog = page.getByRole('alertdialog', { name: 'Delete the report?' });

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(result(page, 'Plain: cancelled')).toBeVisible();
});

test('ConfirmDialog: a confirmed delete moves focus to the list heading, the other list untouched', async ({
  page,
}) => {
  await gotoHydrated(page, '/confirm-dialog');
  const fruit = page.getByRole('region', { name: 'Fruit' });
  const vegetables = page.getByRole('region', { name: 'Vegetables' });

  await fruit.getByRole('button', { name: 'Delete Pear' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete Pear?' });
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(dialog).toBeHidden();
  await expect(fruit.getByRole('heading', { name: 'Fruit' })).toBeFocused();
  await expect(fruit.getByRole('listitem')).toHaveText(['Apple', 'Plum']);
  await expect(vegetables.getByRole('listitem')).toHaveText([
    'Leek',
    'Carrot',
    'Kale',
  ]);
});

test('ConfirmDialog: the challenge starts in its field with autofocus and waits for the digit', async ({
  page,
}) => {
  await gotoHydrated(page, '/confirm-dialog');
  await page.getByRole('switch', { name: 'Start focus in the field' }).click();
  await page.getByRole('button', { name: 'Delete the project' }).click();
  const dialog = page.getByRole('alertdialog', {
    name: 'Delete the project?',
  });
  const field = dialog.getByRole('textbox', { name: 'Confirm number' });
  const confirm = dialog.getByRole('button', { name: 'Delete' });

  await expect(field).toBeFocused();
  await expect(confirm).toBeDisabled();

  const digit = (await field.getAttribute('pattern'))!;
  await field.fill(digit);
  await expect(confirm).toBeEnabled();
  await field.press('Enter');

  await expect(dialog).toBeHidden();
  await expect(result(page, 'Challenge: confirmed')).toBeVisible();
});

test('ConfirmDialog: over an open Dialog, focus returns into that dialog', async ({
  page,
}) => {
  await gotoHydrated(page, '/confirm-dialog');
  await page.getByRole('button', { name: 'Open the finding' }).click();
  const finding = page.getByRole('dialog', { name: 'Finding' });
  await expect(finding).toBeVisible();

  const trigger = finding.getByRole('button', { name: 'Delete report.pdf' });
  await trigger.click();
  const confirm = page.getByRole('alertdialog', {
    name: 'Delete report.pdf?',
  });
  await expect(confirm).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expect(finding).toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(confirm).toBeHidden();
  await expect(finding).toBeVisible();
  await expect
    .poll(async () => (await focusStop(page, finding)).inside)
    .toBe(true);
  await expect(finding.getByRole('listitem')).toHaveText(['screenshot.png']);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('ConfirmDialog: no axe violations while open, with the challenge and an error', async ({
      page,
    }) => {
      await gotoHydrated(page, '/confirm-dialog');

      await page.getByRole('button', { name: 'Delete the project' }).click();
      const challenge = page.getByRole('alertdialog', {
        name: 'Delete the project?',
      });
      await expect(challenge).toBeVisible();
      await challenge.getByRole('textbox').fill('0');
      await opened(page);
      expect(await runAxe(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(challenge).toBeHidden();

      await page
        .getByRole('button', { name: 'Delete the client (fails once)' })
        .click();
      const failing = page.getByRole('alertdialog', {
        name: 'Delete the client?',
      });
      await failing.getByRole('button', { name: 'Delete' }).click();
      await expect(failing.getByRole('alert')).toHaveText(
        'This client still has open audits.',
      );
      await opened(page);
      expect(await runAxe(page)).toEqual([]);
    });
  });
}
