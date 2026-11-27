import { readdirSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { type AxeViolation, gotoHydrated, runAxe, settled } from './helpers';
import { DEMO_SESSION_COOKIE } from '../../.playground/server/utils/demoSession';

/** The routes of a Nuxt pages folder, from its file names */
const routesIn = (dir: string) =>
  readdirSync(new URL(`../../${dir}/`, import.meta.url), {
    recursive: true,
    encoding: 'utf8',
  })
    .filter((file) => file.endsWith('.vue'))
    .map((file) => `/${file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')}`)
    .sort();

const routes = routesIn('.playground/pages');
const authRoutes = routesIn('auth/app/pages');

type Mode = 'light' | 'dark';

const KNOWN_VIOLATIONS: {
  route: string;
  mode?: Mode;
  /** An OPEN_STATES name: the entry applies to that state only */
  open?: string;
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
  // Vue DatePicker names its weekday header cells "Monday" over the text "Mo";
  // they are no controls, so voice control (2.5.3) does not need the text
  {
    route: '/form',
    open: 'DatePicker',
    rule: 'label-content-name-mismatch',
    target: /aria-label="\w+day"/,
  },
  // Days of the month before and after at 1.19:1; datepicker.spec.ts has the fixme
  {
    route: '/form',
    open: 'DatePicker',
    rule: 'color-contrast',
    target: /dp--cell-offset/,
  },
];

// Known defects: a page asks a third party unasked; fails once the request is gone
const KNOWN_THIRD_PARTIES: { route: string; url: string; cause: string }[] = [];

/**
 * How the sweep reaches each page of the auth layer: a route in
 * auth/app/pages without an entry here fails the spec.
 */
const AUTH_PAGES: Record<
  string,
  {
    /** The address, with the query a real visit carries */
    path: string;
    state: 'visitor' | 'signed-in';
  }
> = {
  '/forgot-password': { path: '/forgot-password', state: 'visitor' },
  '/login': { path: '/login', state: 'visitor' },
  '/mfa-setup': { path: '/mfa-setup', state: 'signed-in' },
  // The reset email's link
  '/reset-password': {
    path: '/reset-password?token=demo&email=demo%40example.com',
    state: 'visitor',
  },
  '/two-factor-authentication': {
    path: '/two-factor-authentication',
    state: 'visitor',
  },
};

/** A dialog, popover or menu, scanned open in light mode at desktop width */
const OPEN_STATES: {
  name: string;
  route: string;
  /** Opens it and returns what shows */
  open: (page: Page) => Promise<Locator>;
}[] = [
  {
    name: 'Dialog',
    route: '/dialog',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open dialog center' }).click();
      return page.getByRole('dialog', { name: 'Dialog title' });
    },
  },
  {
    name: 'CookiesDialog',
    route: '/dialog',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open cookies dialog' }).click();
      return page.getByRole('dialog', { name: 'Cookies' });
    },
  },
  {
    name: 'MobileMenu',
    route: '/dialog',
    open: async (page) => {
      await page.getByRole('button', { name: 'Open left menu' }).click();
      return page.getByRole('dialog', { name: 'Mobile menu' });
    },
  },
  {
    name: 'Popover',
    route: '/tooltip',
    open: async (page) => {
      await page.getByRole('button', { name: 'More options' }).click();
      return page.getByRole('navigation', { name: 'More options' });
    },
  },
  {
    name: 'UserMenu',
    route: '/form',
    open: async (page) => {
      await page
        .getByRole('banner')
        .getByRole('button', { name: 'User menu C', exact: true })
        .click();
      return page.locator('.user-menu-popover');
    },
  },
  {
    name: 'Tooltip',
    route: '/tooltip',
    open: async (page) => {
      await page.getByRole('button', { name: 'Live regions' }).first().click();
      return page.getByText('Live regions are used').first();
    },
  },
  {
    name: 'DatePicker',
    route: '/form',
    open: async (page) => {
      const combobox = page.getByRole('combobox', { name: 'DatePicker' });
      await combobox.click();
      return page.locator(`#${await combobox.getAttribute('aria-controls')}`);
    },
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

/** Runs axe; fails softly on a violation not in the list, and on a listed one that is gone. */
async function expectAxe(
  page: Page,
  route: string,
  mode: Mode,
  when: string,
  open?: string,
) {
  const known = KNOWN_VIOLATIONS.filter(
    (k) => k.route === route && (!k.mode || k.mode === mode) && k.open === open,
  );
  const violations = await runAxe(page);
  const matches = (k: (typeof known)[number], v: AxeViolation) =>
    k.rule === v.rule && k.target.test(v.target);

  expect
    .soft(
      violations
        .filter((v) => !known.some((k) => matches(k, v)))
        .map((v) => `${v.rule} ${v.target}: ${v.summary}`),
      `new axe violations (${when})`,
    )
    .toEqual([]);
  expect
    .soft(
      known
        .filter((k) => !violations.some((v) => matches(k, v)))
        .map((k) => `${k.rule} ${k.target}`),
      `known violations that are gone (${when}): take them out of the list`,
    )
    .toEqual([]);
}

/** Narrows the viewport to 320px; the page must not scroll sideways. */
async function expectNoSideScroll(page: Page) {
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
}

/** Switches the playground to Dutch as a user does: in the UserMenu. */
async function switchToDutch(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: 'User menu C', exact: true })
    .click();
  const panel = page.locator('.user-menu-popover');
  await expect(panel).toBeVisible();
  await settled(page);
  // The label covers its radio, as a user sees it
  await panel.getByText('Nederlands').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
}

test('every page of the auth layer has a place in the sweep', () => {
  expect(Object.keys(AUTH_PAGES).sort()).toEqual(authRoutes);
});

for (const mode of modes) {
  test.describe(`${mode.name} mode`, () => {
    test.use({ colorScheme: mode.colorScheme });

    // Console errors, hydration warnings and other origins fail them through ./test.ts
    for (const route of routes) {
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

        await expectAxe(page, route, mode.name, 'desktop');
        await expectNoSideScroll(page);
        // Layout and language do not change with the mode: once is enough
        if (mode.name === 'dark') return;

        await expectAxe(page, route, mode.name, '320px');
        await switchToDutch(page);
        await expectNoSideScroll(page);
        await expectAxe(page, route, mode.name, '320px, Dutch');
      });
    }

    for (const route of authRoutes) {
      test(`auth ${route}`, async ({ page, context }) => {
        const { path, state } = AUTH_PAGES[route] ?? {};
        test.skip(!path, 'not in AUTH_PAGES: the test above fails');

        if (state === 'signed-in') {
          await context.addCookies([
            {
              name: DEMO_SESSION_COOKIE,
              value: '1',
              url: test.info().project.use.baseURL!,
            },
          ]);
        }
        await gotoHydrated(page, path!);
        await expect(page).toHaveURL((url) => url.pathname === route);
        await expect(page.locator('html')).toHaveClass(
          new RegExp(mode.className),
        );

        await expectAxe(page, route, mode.name, 'desktop');
        await expectNoSideScroll(page);
        if (mode.name === 'dark') return;

        await expectAxe(page, route, mode.name, '320px');

        if (state === 'signed-in') {
          // `?locale=` is for a visitor: a user switches on the way here
          await gotoHydrated(page, '/auth');
          await switchToDutch(page);
          await page.getByRole('link', { name: 'MFA setup' }).click();
          await expect(page).toHaveURL((url) => url.pathname === route);
        } else {
          const dutch = new URL(path!, 'http://localhost');
          dutch.searchParams.set('locale', 'nl');
          await gotoHydrated(page, dutch.pathname + dutch.search);
        }
        await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
        await expectNoSideScroll(page);
        await expectAxe(page, route, mode.name, '320px, Dutch');
      });
    }
  });
}

test.describe('open', () => {
  test.use({ colorScheme: 'light' });

  for (const { name, route, open } of OPEN_STATES) {
    test(`${name} on ${route}`, async ({ page }) => {
      // March 2026 starts on a Sunday: DatePicker's grid shows days of February
      await page.clock.setFixedTime(new Date('2026-03-15T12:00:00'));
      await gotoHydrated(page, route);
      await expect(await open(page)).toBeVisible();
      await settled(page);
      await expectAxe(page, route, 'light', `${name} open`, name);
    });
  }
});
