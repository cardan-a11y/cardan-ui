import { readdirSync } from 'node:fs';
import { expect, test } from './test';
import { type AxeViolation, gotoHydrated, runAxe } from './helpers';

const pagesDir = new URL('../../.playground/pages/', import.meta.url);

const routes = readdirSync(pagesDir, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.vue'))
  .map((file) => `/${file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`)
  .sort();

const KNOWN_VIOLATIONS: {
  route: string;
  mode?: 'light' | 'dark';
  rule: string;
  /** Matched against axe's target, which may carry generated class names */
  target: RegExp;
}[] = [
  // md-editor-v3's syntax colours on the light card: 1.65:1 to 3.29:1
  {
    route: '/markdown',
    mode: 'light',
    rule: 'color-contrast',
    target: /\.cm-line|ͼ/,
  },
];

// Known defects: a page asks a third party unasked; fails once the request is gone
const KNOWN_THIRD_PARTIES: { route: string; url: string; cause: string }[] = [
  {
    route: '/video',
    // VideoPlayer would ask the same address; it goes through /_ipx instead
    url: 'https://i.ytimg.com/vi_webp/PGvgdZuQu6w/hq720.webp',
    cause:
      "YouTube.vue: Nuxt Scripts' ScriptYouTubePlayer loads its placeholder from YouTube on mount",
  },
];

// A 1×1 transparent PNG, for an image a third party would have sent
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const modes = [
  { name: 'light', colorScheme: 'light', className: 'light-mode' },
  { name: 'dark', colorScheme: 'dark', className: 'dark-mode' },
] as const;

for (const mode of modes) {
  test.describe(`${mode.name} mode`, () => {
    test.use({ colorScheme: mode.colorScheme });

    for (const route of routes) {
      // Console errors, hydration warnings and other origins fail it through ./test.ts
      test(route, async ({ page, otherOrigins }) => {
        for (const known of KNOWN_THIRD_PARTIES.filter(
          (k) => k.route === route,
        ))
          otherOrigins.answer(
            (url) => url.href === known.url,
            { body: PIXEL, contentType: 'image/png' },
            `${known.url} (${known.cause})`,
          );
        await gotoHydrated(page, route);
        await expect(page.locator('html')).toHaveClass(
          new RegExp(mode.className),
        );

        const known = KNOWN_VIOLATIONS.filter(
          (k) => k.route === route && (!k.mode || k.mode === mode.name),
        );
        const violations = await runAxe(page);
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
      });
    }
  });
}
