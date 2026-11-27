import { expect, test } from './test';
import { axNode, gotoHydrated } from './helpers';

test('a required field is named "Password required", not "Passwordrequired"', async ({
  page,
}) => {
  await gotoHydrated(page, '/login');
  const password = page.locator('input[type="password"]');

  expect((await axNode(password)).name).toBe('Password required');
  const label = await password.evaluate((el) =>
    (el as HTMLInputElement).labels?.[0]?.textContent?.replace(/\s+/g, ' '),
  );
  expect(label?.trim()).toBe('Password required');
});

test('a required checkbox and group are named with the chip as a word of its own', async ({
  page,
}) => {
  await gotoHydrated(page, '/form');
  await page.getByRole('switch', { name: 'Require form inputs' }).click();

  const checkbox = page.getByRole('checkbox', { name: 'Checkbox required' });
  await expect(checkbox).toBeVisible();
  expect((await axNode(checkbox)).name).toBe('Checkbox required');

  const group = page.getByRole('group', { name: 'Checkbox group required' });
  expect((await axNode(group)).name).toBe('Checkbox group required');
});
