import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { projects } from '../project-list';
import { checkContrast, contrastKey } from './helpers';

const files: { name: string; path: string; known: string[] }[] = [
  // The layer's own template, not a project
  { name: 'template', path: '../../app/assets/main.css', known: [] },
  ...projects.map(({ folder, name, contrast }) => ({
    name,
    path: `../../../${folder}/app/assets/main.css`,
    known: contrast?.known ?? [],
  })),
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
