import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { checkContrast, contrastKey } from './helpers';

const files: { name: string; path: string; known: string[] }[] = [
  { name: 'template', path: '../../app/assets/main.css', known: [] },
  {
    name: 'academy',
    path: '../../../cardan-academy-nuxt/app/assets/main.css',
    known: [],
  },
  {
    name: 'auditor',
    path: '../../../cardan-auditor-nuxt/app/assets/main.css',
    known: [],
  },
  {
    name: 'cms',
    path: '../../../cardan-cms-nuxt/app/assets/main.css',
    // Its own light orange graphic: 2.95:1 on the page, 2.33:1 on the track
    known: [
      'light-mode --color-orange-graphic on --color-bg',
      'light-mode --color-orange-graphic on --color-track',
    ],
  },
  {
    name: 'support',
    path: '../../../cardan-support-nuxt/app/assets/main.css',
    known: [],
  },
];

for (const file of files) {
  const path = new URL(file.path, import.meta.url);

  test(`token contrast: ${file.name}`, async ({ page }) => {
    test.skip(!existsSync(path), `no checkout at ${file.path}`);

    const results = await checkContrast(page, {
      mainCss: readFileSync(path, 'utf8'),
    });
    const failing = results.filter((r) => r.ratio < r.min);

    expect
      .soft(
        failing
          .filter((r) => !file.known.includes(contrastKey(r)))
          .map(
            (r) =>
              `${contrastKey(r)}: ${r.missing ? `${r.missing} missing` : `${r.ratio}:1`}, ${r.min}:1 needed`,
          ),
        'pairs under their minimum',
      )
      .toEqual([]);
    expect
      .soft(
        file.known.filter(
          (key) => !failing.some((r) => contrastKey(r) === key),
        ),
        'known failures that pass now: take them out of the list',
      )
      .toEqual([]);
  });
}
