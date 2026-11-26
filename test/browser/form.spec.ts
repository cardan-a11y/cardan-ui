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

  await input.pressSequentially('A');
  await expect(input).not.toHaveAttribute('aria-invalid');
  await submit.click();
  await expect(
    page.getByRole('combobox', { name: 'Select required', exact: true }),
  ).toBeFocused();
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

  // A non-ASCII domain is a real address
  await email.fill('ada@bücher.de');
  await submit.click();
  await expect(email).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('pre code')).toContainText('"email"');
});

test('SpinButton shows its range error while a number is typed, and hides it in range', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const field = page.getByRole('spinbutton', { name: 'Spin button' });
  const error = page.getByText('Enter 20 or less');

  await field.fill('');
  await field.pressSequentially('25');
  await expect(field).toBeFocused();
  await expect(error).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(/Enter 20 or less/);

  await field.press('Backspace');
  await expect(error).toBeHidden();
  await expect(field).not.toHaveAttribute('aria-invalid');
});

test('FileInput in document mode with a name: the form posts the file, also after a rejected one, and a submit without one is held back', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const demo = page.locator('.demo-document-form');
  const input = demo.getByLabel('Upload file');
  const submit = demo.getByRole('button', { name: 'Upload', exact: true });

  await submit.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/Upload file is missing/);

  await input.setInputFiles({
    name: 'essay.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await expect(input).not.toHaveAttribute('aria-invalid');
  await expect(demo.getByText('essay.pdf', { exact: true })).toBeVisible();

  await submit.click();
  await expect(demo.locator('pre code')).toHaveText(/^document: essay\.pdf/);

  await input.setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png'),
  });
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await submit.click();
  await expect(demo.locator('pre code')).toHaveText(/^document: essay\.pdf/);
});

test.describe('before hydration, also of a lazily hydrated part', () => {
  test.use({ javaScriptEnabled: false });

  test('a submit does not post the form natively, so nothing typed ends up in the address', async ({
    page,
  }) => {
    await page.goto('/form');
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.getByRole('textbox', { name: 'Email address' }).fill('a@b.nl');

    await page.getByRole('button', { name: 'Submit' }).first().click();
    await page.waitForTimeout(500);

    expect(page.url()).toMatch(/\/form$/);
    expect(requests).toEqual([]);
  });
});
