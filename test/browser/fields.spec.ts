import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { gotoHydrated } from './helpers';

/**
 * The error text shows through CSS (`:has(:invalid)`, InputError) and the
 * field says it is invalid through script (`aria-invalid`, its
 * `aria-describedby`): on /form, the two agree for every field.
 */
function errorStates(page: Page) {
  return page
    .locator('form[aria-labelledby="form-fields-heading"]')
    .evaluate((form) =>
      Array.from(form.querySelectorAll<HTMLElement>('[id^="error-"]')).map(
        (error) => {
          const described = form.querySelector(
            `[aria-describedby~="${CSS.escape(error.id)}"]`,
          );
          const control =
            described ??
            document.getElementById(error.id.slice('error-'.length));
          const box = error.getBoundingClientRect();
          const label = control
            ?.closest('fieldset, .form-field-wrapper, div')
            ?.querySelector('legend, label')
            ?.textContent?.replace(/\s+/g, ' ')
            .trim();
          return {
            field: `${label} (${error.id})`,
            visible:
              error.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
              }) &&
              box.height > 0 &&
              !!error.textContent?.trim(),
            described: !!described,
            invalid: control?.getAttribute('aria-invalid') === 'true',
            group: control?.tagName === 'FIELDSET',
          };
        },
      ),
    );
}

async function expectErrorsAgree(page: Page) {
  const states = await errorStates(page);
  expect(states.length).toBeGreaterThan(0);
  for (const state of states) {
    expect.soft(state.visible, `${state.field} visible`).toBe(state.described);
    if (!state.group) {
      expect
        .soft(state.invalid, `${state.field} aria-invalid`)
        .toBe(state.described);
    }
  }
  return states;
}

const submitForm = (page: Page) =>
  page
    .locator('form[aria-labelledby="form-fields-heading"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

test.describe('Fields on /form', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHydrated(page, '/form');
  });

  test('show their error text exactly while they say they are invalid, before and after a failed submit', async ({
    page,
  }) => {
    const before = await expectErrorsAgree(page);
    expect(before.filter((state) => state.described)).toEqual([]);

    await page.getByRole('switch', { name: 'Require form inputs' }).click();
    await submitForm(page);
    const after = await expectErrorsAgree(page);
    expect(after.filter((state) => state.described).length).toBeGreaterThan(3);
  });

  for (const state of ['Readonly form inputs', 'Disable form inputs']) {
    test(`show no error they do not say, and say none they do not show, ${state.toLowerCase()}`, async ({
      page,
    }) => {
      await page.getByRole('switch', { name: 'Require form inputs' }).click();
      await page.getByRole('switch', { name: state, exact: true }).click();
      await submitForm(page);
      await expectErrorsAgree(page);
    });
  }

  test('a failed submit moves focus to a required CheckboxGroup without a tick', async ({
    page,
  }) => {
    await page.getByRole('switch', { name: 'Require form inputs' }).click();
    await page.getByRole('textbox', { name: /^Input/ }).fill('Ada');
    await page
      .getByRole('combobox', { name: /^Select/ })
      .selectOption({ index: 1 });
    await page
      .getByRole('textbox', { name: 'Email address' })
      .fill('ada@example.com');
    await page.getByRole('spinbutton', { name: 'Spin button' }).fill('3');
    await page.getByRole('textbox', { name: 'Textarea' }).fill('Text');
    await page
      .getByRole('checkbox', { name: /^Checkbox( required)?$/ })
      .check();

    await page.getByRole('button', { name: 'Submit' }).click();

    const group = page.getByRole('group', { name: /^Checkbox group/ });
    await expect(group.getByRole('checkbox').first()).toBeFocused();
  });

  test("Search's reset returns focus to its field", async ({ page }) => {
    const search = page.getByRole('search');
    const field = search.getByRole('searchbox');
    await field.fill('accessibility');

    await search.getByRole('button', { name: 'Reset' }).click();

    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
  });

  test("FileInput's delete returns focus to its field", async ({ page }) => {
    const field = page.getByLabel('Profile picture');
    await field.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      // A 1×1 transparent PNG
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(field).toBeFocused();
  });
});
