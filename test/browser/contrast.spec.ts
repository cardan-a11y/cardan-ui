/**
 * The contrast of the design tokens (WCAG 2.2 AA) in light and dark mode,
 * resolved by the browser so `color-mix()`, `oklch()` and relative colours
 * count as they paint: the template main.css, and each project's own copy
 * when its checkout is next to this one (skipped otherwise, as in CI).
 *
 * A pair in a file's known failures does not fail the test; any other pair
 * under its minimum does, and so does a known failure that now passes (take
 * it out then).
 */
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
    // Its own palette: the light orange graphic is 2.95:1 on the page and
    // 2.33:1 on the track (a meter or progress bar), 3:1 needed
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
