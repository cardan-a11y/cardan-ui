import { expect, test } from '@playwright/test';
import { contrastRatio, gotoHydrated } from './helpers';

for (const mode of ['light', 'dark'] as const) {
  test(`the password requirements box stands out from the card it is on (${mode})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: mode });
    await gotoHydrated(page, '/auth');
    const box = page.locator('.card .password-requirements').first();
    await expect(box).toBeVisible();

    const [boxColor, cardColor] = await box.evaluate((element) => {
      const card = element.closest('.card')!;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const paint = (...colors: string[]) => {
        context.clearRect(0, 0, 1, 1);
        for (const color of ['#fff', ...colors]) {
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
        }
        return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
      };
      const cardBackground = getComputedStyle(card).backgroundColor;
      return [
        paint(cardBackground, getComputedStyle(element).backgroundColor),
        paint(cardBackground),
      ];
    });

    expect(contrastRatio(boxColor!, cardColor!)).toBeGreaterThan(1.05);
  });
}
