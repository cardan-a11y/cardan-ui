import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { checkContrast, contrastKey } from './helpers';

test('token contrast: template', async ({ page }) => {
  const results = await checkContrast(page, {
    mainCss: readFileSync(
      new URL('../../app/assets/main.css', import.meta.url),
      'utf8',
    ),
  });

  expect(
    results
      .filter((r) => r.ratio < r.min)
      .map(
        (r) =>
          `${contrastKey(r)}: ${r.missing ? `${r.missing} missing` : `${r.ratio}:1`}, ${r.min}:1 needed`,
      ),
    'pairs under their minimum',
  ).toEqual([]);
});
