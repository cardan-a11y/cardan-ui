/**
 * Values the browser lets through but the Laravel APIs refuse: a required
 * field of only spaces and an e-mail address without a dot in its domain.
 * Input makes them invalid with its `pattern`, Textarea with a custom
 * validity; here the real browser holds the submit back and Form focuses
 * the field.
 */
import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

test('a required field of only spaces holds the submit back, with focus on it', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  await page.getByRole('switch', { name: 'Require form inputs' }).click();
  const input = page.getByRole('textbox', {
    name: 'Input required',
    exact: true,
  });
  const submit = page.getByRole('button', { name: 'Submit' });

  await input.fill('   ');
  await submit.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/Input is missing/);

  // A letter makes it valid: the next invalid field takes focus
  await input.pressSequentially('A');
  await expect(input).not.toHaveAttribute('aria-invalid');
  await submit.click();
  await expect(
    page.getByRole('combobox', { name: 'Select required', exact: true }),
  ).toBeFocused();

  const textarea = page.getByRole('textbox', { name: 'Textarea required' });
  await textarea.fill('  \n  ');
  expect(
    await textarea.evaluate((el) => (el as HTMLTextAreaElement).validity.valid),
  ).toBe(false);
  await textarea.pressSequentially('A');
  expect(
    await textarea.evaluate((el) => (el as HTMLTextAreaElement).validity.valid),
  ).toBe(true);
});

test('an e-mail address without a dot in its domain holds the submit back, with focus on it', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const email = page.getByRole('textbox', { name: 'Email address' });
  const submit = page.getByRole('button', { name: 'Submit' });

  await email.fill('a@b');
  await submit.click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription(/Email address is invalid/);

  // A domain in letters beyond ASCII is a real address: the form submits it
  await email.fill('ada@bücher.de');
  await submit.click();
  await expect(email).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('pre code')).toContainText('"email"');
});
