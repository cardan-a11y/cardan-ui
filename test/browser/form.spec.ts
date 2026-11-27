import { expect, test } from './test';
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

test('FileInput with a name: once compressorjs is done, the form posts the compressed image, smaller than the chosen one', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const demo = page.locator('.demo-file-form');
  // Noise does not compress as PNG: about 3 MB, under the 5 MB limit
  const png = Buffer.from(
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 900;
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(900, 900);
      for (let i = 0; i < image.data.length; i++) {
        image.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
      }
      context.putImageData(image, 0, 0);
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      return [...new Uint8Array(await blob.arrayBuffer())];
    }),
  );
  expect(png.length).toBeGreaterThan(500_000);

  await demo.getByLabel('Upload file').setInputFiles({
    name: 'noise.png',
    mimeType: 'image/png',
    buffer: png,
  });
  // Past convertSize, compressorjs makes it a JPEG
  await expect(demo.getByText('noise.jpg', { exact: true })).toBeVisible();
  await demo.getByRole('button', { name: 'Upload', exact: true }).click();

  const posted = page.locator('.demo-file-form-posted code');
  await expect(posted).toHaveText(/^file: noise\.jpg \(\d+ bytes\)$/);
  const size = Number((await posted.textContent())!.match(/\((\d+) bytes/)![1]);
  expect(size).toBeGreaterThan(0);
  expect(size).toBeLessThan(png.length);
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

test('a Form rendered after a client-side navigation takes its attributes: the form is a landmark named by its heading', async ({
  page,
}) => {
  await gotoHydrated(page, '/');
  await page.getByRole('link', { name: 'Form inputs' }).first().click();
  await expect(page).toHaveURL(/\/form$/);

  await expect(page.getByRole('form', { name: 'Form fields' })).toBeVisible();
});

test('Input names the length it needs once a typed text is too short', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  const input = page.getByRole('textbox', { name: 'Input', exact: true });

  // The browser sets tooShort only after real typing
  await input.pressSequentially('A');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(
    /Enter at least 2 characters/,
  );

  await input.pressSequentially('d');
  await expect(input).not.toHaveAttribute('aria-invalid');
});

test('Form: a reset hides the errors of a failed submit', async ({ page }) => {
  await gotoHydrated(page, '/form');
  await page.getByRole('switch', { name: 'Require form inputs' }).click();
  const input = page.getByRole('textbox', {
    name: 'Input required',
    exact: true,
  });

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Input is missing')).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(input).not.toHaveAttribute('aria-invalid');
  await expect(page.getByText('Input is missing')).toBeHidden();
  await expect(input).not.toHaveAccessibleDescription(/Input is missing/);
});

test('Form: the submit of a ConfirmDialog nested in it is that dialog’s own', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  await page.getByRole('switch', { name: 'Require form inputs' }).click();
  const input = page.getByRole('textbox', {
    name: 'Input required',
    exact: true,
  });

  const trigger = page.getByRole('button', { name: 'Delete the saved draft' });
  await trigger.click();
  const dialog = page.getByRole('alertdialog', {
    name: 'Delete the saved draft?',
  });
  const field = dialog.getByRole('textbox', { name: 'Confirm number' });
  await expect(field).toBeFocused();
  await field.fill((await field.getAttribute('pattern'))!);
  await field.press('Enter');

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByText('The saved draft was deleted.')).toBeVisible();
  // The outer Form neither checked its empty required fields nor submitted.
  // Browsers end a submit at an ancestor form; Form.test.ts pins Form's own guard
  await expect(input).not.toHaveAttribute('aria-invalid');
  await expect(page.locator('pre code')).toBeHidden();
});
