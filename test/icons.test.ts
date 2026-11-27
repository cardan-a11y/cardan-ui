import { globSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { bundledIcons } from '../app/utils/icons';

// @nuxt/icon's scan reads no .ts file (README, "Icons in an SPA")
describe('icons named in a .ts file', () => {
  it('are in bundledIcons', () => {
    const files = globSync('{app,auth/app}/**/*.ts', {
      exclude: ['**/utils/icons.ts'],
    });
    const named = files.flatMap((file) =>
      [
        ...readFileSync(file, 'utf8').matchAll(
          /(?<![\w-])(?:material-symbols|svg-spinners):[a-z0-9]+(?:-[a-z0-9]+)*/g,
        ),
      ].map(([icon]) => `${icon} (${file})`),
    );
    expect(
      named.filter((entry) => !bundledIcons.includes(entry.split(' ')[0]!)),
    ).toEqual([]);
  });
});
