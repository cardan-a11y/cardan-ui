/**
 * Every playground page, server-rendered and hydrated, in light and dark
 * mode: no console errors or hydration warnings, no sideways scroll at
 * 320px, and axe with color-contrast, which needs the real layout and
 * styles. A violation that is in KNOWN_VIOLATIONS does not fail the test;
 * any other does, and so does a known one that is gone (remove it then).
 */
import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { type AxeViolation, gotoHydrated, runAxe } from './helpers';

const pagesDir = new URL('../../.playground/pages/', import.meta.url);

/** The routes of .playground/pages: `index.vue` is its folder */
const routes = readdirSync(pagesDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.vue'))
  .map((file) => `/${file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`)
  .sort();

/**
 * Violations on the playground today. Each is a finding to fix, not a rule
 * switched off: take it out when it is fixed, or the test fails.
 */
const KNOWN_VIOLATIONS: {
  route: string;
  mode?: 'light' | 'dark';
  rule: string;
  /** Matched against axe's target, which may carry generated class names */
  target: RegExp;
}[] = [
  // MarkdownEditor: md-editor-v3's syntax colours in the editor's code, on
  // the light card: 1.65:1 (#e5c07b) to 3.29:1 (#2d8cf0), 4.5:1 needed
  {
    route: '/markdown',
    mode: 'light',
    rule: 'color-contrast',
    target: /\.cm-line|ͼ/,
  },
];

/** The playground's own axe tool (vue-axe), not part of the layer */
const EXCLUDE = ['.va-popup-btn', '.va-popup'];

const modes = [
  { name: 'light', colorScheme: 'light', className: 'light-mode' },
  { name: 'dark', colorScheme: 'dark', className: 'dark-mode' },
] as const;

for (const mode of modes) {
  test.describe(`${mode.name} mode`, () => {
    test.use({ colorScheme: mode.colorScheme });

    for (const route of routes) {
      test(route, async ({ page }) => {
        const problems: string[] = [];
        page.on('console', (message) => {
          if (
            message.type() === 'error' ||
            (message.type() === 'warning' && /hydrat/i.test(message.text()))
          ) {
            problems.push(`${message.type()}: ${message.text()}`);
          }
        });
        page.on('pageerror', (error) =>
          problems.push(`pageerror: ${error.message}`),
        );

        await gotoHydrated(page, route);
        await expect(page.locator('html')).toHaveClass(
          new RegExp(mode.className),
        );

        const known = KNOWN_VIOLATIONS.filter(
          (k) => k.route === route && (!k.mode || k.mode === mode.name),
        );
        const violations = await runAxe(page, { exclude: EXCLUDE });
        const isKnown = (v: AxeViolation) =>
          known.some((k) => k.rule === v.rule && k.target.test(v.target));

        expect
          .soft(
            violations
              .filter((v) => !isKnown(v))
              .map((v) => `${v.rule} ${v.target}: ${v.summary}`),
            'new axe violations',
          )
          .toEqual([]);
        expect
          .soft(
            known
              .filter(
                (k) =>
                  !violations.some(
                    (v) => k.rule === v.rule && k.target.test(v.target),
                  ),
              )
              .map((k) => `${k.rule} ${k.target}`),
            'known violations that are gone: take them out of the list',
          )
          .toEqual([]);

        // No sideways scroll on a phone
        await page.setViewportSize({ width: 320, height: 640 });
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
            ),
          )
          .toBeLessThanOrEqual(0);

        expect(problems, 'console errors and hydration warnings').toEqual([]);
      });
    }
  });
}
