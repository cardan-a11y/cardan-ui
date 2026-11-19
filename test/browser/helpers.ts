/**
 * Playwright checks happy-dom cannot do, for the projects too:
 * `import { focusWalk, runAxe, checkContrast } from '../cardan-ui/test/browser/helpers'`
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Locator, Page } from '@playwright/test';
import type { AxeResults } from 'axe-core';

/** Goes to a page of a Nuxt app and waits until it is hydrated and the network idle. */
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () =>
      !!(document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)
        ?.__vue_app__,
  );
}

/** Where focus is after one key press of a walk */
export interface FocusStop {
  /** `tag[role] "name"`, for messages */
  label: string;
  /** The same for the same element during a page's life, '' on the body */
  key: string;
  /** Whether focus is inside the `within` element of the walk */
  inside: boolean;
  /** Whether the focused element is inside something `inert` */
  inert: boolean;
  /** Whether focus is on the body: nothing focused */
  onBody: boolean;
}

/** The element that has focus, described, and where it is. */
export async function focusStop(
  page: Page,
  within?: Locator,
): Promise<FocusStop> {
  const container = within ? await within.elementHandle() : null;

  return page.evaluate((container) => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;

    const text = (value?: string | null) =>
      (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const labelledBy = el?.getAttribute('aria-labelledby');
    const name = text(
      el?.getAttribute('aria-label') ||
        (labelledBy &&
          labelledBy
            .split(' ')
            .map((id) => document.getElementById(id)?.textContent)
            .join(' ')) ||
        (el as HTMLInputElement | null)?.labels?.[0]?.textContent ||
        el?.textContent,
    );
    const role = el?.getAttribute('role');
    const onBody = !el || el === document.body;

    const w = window as unknown as { focusWalkKeys?: WeakMap<Element, string> };
    w.focusWalkKeys ??= new WeakMap();
    if (el && !onBody && !w.focusWalkKeys.has(el)) {
      w.focusWalkKeys.set(el, String(Math.random()));
    }

    return {
      label: onBody
        ? 'body'
        : `${el!.tagName.toLowerCase()}${role ? `[${role}]` : ''}${name ? ` "${name}"` : ''}`,
      key: (!onBody && el && w.focusWalkKeys.get(el)) || '',
      inside: !!container && !!el && container.contains(el),
      inert: !!el?.closest('[inert]'),
      onBody,
    };
  }, container);
}

/**
 * The key that moves focus on: Option+Tab in WebKit, whose Tab skips links and
 * buttons unless Safari's "Press Tab to highlight each item" is on.
 */
export function tabKey(page: Page, { reverse = false } = {}): string {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  return `${reverse ? 'Shift+' : ''}${webkit ? 'Alt+' : ''}Tab`;
}

/** Presses `tabKey` `steps` times and returns where focus went after each press. */
export async function focusWalk(
  page: Page,
  steps: number,
  { reverse = false, within }: { reverse?: boolean; within?: Locator } = {},
): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];

  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(tabKey(page, { reverse }));
    stops.push(await focusStop(page, within));
  }

  return stops;
}

/** Every stop of `tabKey` from where focus is until it returns there (or `max` presses). */
export async function tabOrder(page: Page, max = 400): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];

  for (let i = 0; i < max; i++) {
    await page.keyboard.press(tabKey(page));
    const stop = await focusStop(page);
    if (stops.length && stop.key && stop.key === stops[0]!.key) break;
    stops.push(stop);
  }

  return stops;
}

/** Elements on the page with an `inert` attribute, described */
export function inertElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[inert]')].map(
      (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`,
    ),
  );
}

/** A node of Chromium's own accessibility tree */
export interface AxNode {
  role: string;
  name: string;
  ignored: boolean;
  /** Its properties: `expanded`, `focusable`, `live`, … */
  properties: Record<string, unknown>;
}

/**
 * Chromium's accessibility node of an element, with state the DOM does not
 * carry (`expanded` of a `popovertarget` button). Chromium only.
 */
export async function axNode(locator: Locator): Promise<AxNode> {
  const page = locator.page();
  const marker = `ax-${Math.random().toString(36).slice(2)}`;
  await locator.evaluate(
    (el, marker) => el.setAttribute('data-ax', marker),
    marker,
  );

  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeId } = await cdp.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: `[data-ax="${marker}"]`,
    });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', {
      nodeId,
      fetchRelatives: false,
    });
    const node = nodes[0]!;

    return {
      role: String(node.role?.value ?? ''),
      name: String(node.name?.value ?? ''),
      ignored: node.ignored,
      properties: Object.fromEntries(
        (node.properties ?? []).map((p) => [p.name, p.value.value]),
      ),
    };
  } finally {
    await cdp.detach();
    await locator.evaluate((el) => el.removeAttribute('data-ax'));
  }
}

/** One element that breaks one axe rule */
export interface AxeViolation {
  rule: string;
  /** The CSS path axe gives the element */
  target: string;
  impact: string;
  /** What is wrong, with the measured values for color-contrast */
  summary: string;
}

const axeSource = () =>
  readFileSync(
    createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
    'utf8',
  );

/** Runs axe-core with every rule, color-contrast included: one entry per element and rule. */
export async function runAxe(
  page: Page,
  { exclude = [] as string[] } = {},
): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: axeSource() });

  return page.evaluate(async (exclude) => {
    const { axe } = window as unknown as {
      axe: { run: (context: unknown, options: unknown) => Promise<AxeResults> };
    };
    const results = await axe.run(
      { exclude: exclude.map((selector) => [selector]) },
      { resultTypes: ['violations'] },
    );

    return results.violations.flatMap((violation) =>
      violation.nodes.map((node) => ({
        rule: violation.id,
        target: node.target.join(' '),
        impact: violation.impact ?? '',
        summary: node.any[0]?.message ?? node.failureSummary ?? '',
      })),
    );
  }, exclude);
}

/** Two tokens and the ratio they must reach */
export interface ContrastPair {
  fg: string;
  bg: string;
  min: 4.5 | 3;
}

export interface ContrastResult extends ContrastPair {
  mode: string;
  /** Rounded down to two decimals; 0 when a token is not declared */
  ratio: number;
  /** A token that the file does not declare in this mode */
  missing?: string;
}

/** The token pairs every Cardan palette must meet (WCAG 2.2 AA), from the tokens `mainCss` declares. */
export function contrastPairs(mainCss: string): ContrastPair[] {
  const declared = (pattern: RegExp) => [
    ...new Set([...mainCss.matchAll(pattern)].map((match) => match[1]!)),
  ];
  const tintedColors = declared(/--color-([a-z]+)-text\s*:/g).filter(
    (x) => x !== 'grey',
  );
  const graphics = declared(/--color-([a-z]+)-graphic\s*:/g);
  const surfaces = ['--color-bg', '--color-card-bg', '--color-white'];
  const pairs: ContrastPair[] = [];

  for (const x of tintedColors) {
    const text = `--color-${x}-text`;
    if (mainCss.includes(`--color-${x}-bg:`)) {
      pairs.push({ fg: text, bg: `--color-${x}-bg`, min: 4.5 });
    }
    for (const bg of surfaces) pairs.push({ fg: text, bg, min: 4.5 });
    pairs.push({ fg: '--color-white', bg: text, min: 4.5 });
  }

  for (const fg of ['--color-text', '--color-grey-text']) {
    for (const bg of [
      '--color-bg',
      '--color-card-bg',
      '--color-dialog-bg',
      '--color-input-bg',
    ]) {
      pairs.push({ fg, bg, min: 4.5 });
    }
  }

  for (const bg of ['--color-accent', '--color-accent-hover']) {
    pairs.push({ fg: '--color-on-accent', bg, min: 4.5 });
  }

  for (const x of graphics) {
    const graphic = `--color-${x}-graphic`;
    for (const bg of surfaces) pairs.push({ fg: graphic, bg, min: 3 });
    if (['accent', 'green', 'orange', 'red'].includes(x)) {
      pairs.push({ fg: graphic, bg: '--color-track', min: 3 });
    }
  }

  for (const bg of ['--color-bg', '--color-card-bg']) {
    pairs.push({ fg: '--focus-color', bg, min: 3 });
  }

  return pairs;
}

function srgbToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: number[]) {
  return (
    0.2126 * srgbToLinear(r!) +
    0.7152 * srgbToLinear(g!) +
    0.0722 * srgbToLinear(b!)
  );
}

export function contrastRatio(a: number[], b: number[]) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/**
 * The contrast of each pair of the `mainCss` text per mode class, as the browser
 * paints it (`color-mix()`, transparency over its background). Filter on `ratio < min`.
 */
export async function checkContrast(
  page: Page,
  {
    mainCss,
    modes = ['light-mode', 'dark-mode'],
    pairs = contrastPairs(mainCss),
  }: { mainCss: string; modes?: string[]; pairs?: ContrastPair[] },
): Promise<ContrastResult[]> {
  await page.setContent(
    '<!doctype html><html><head></head><body></body></html>',
  );
  await page.addStyleTag({ content: mainCss });

  const results: ContrastResult[] = [];

  for (const mode of modes) {
    const painted = await page.evaluate(
      ({ mode, pairs }) => {
        document.documentElement.className = mode;
        const probe = document.createElement('div');
        document.body.append(probe);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

        function resolve(token: string) {
          if (!getComputedStyle(probe).getPropertyValue(token).trim()) {
            return null;
          }
          probe.style.setProperty('color', `var(${token})`);
          return getComputedStyle(probe).color;
        }

        function paint(...colors: string[]) {
          ctx.clearRect(0, 0, 1, 1);
          for (const color of ['#fff', ...colors]) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
          }
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        }

        const out = pairs.map(({ fg, bg }) => {
          const fgColor = resolve(fg);
          const bgColor = resolve(bg);
          if (!fgColor || !bgColor) {
            return { missing: !fgColor ? fg : bg };
          }
          return { fg: paint(bgColor, fgColor), bg: paint(bgColor) };
        });
        probe.remove();
        return out;
      },
      { mode, pairs },
    );

    pairs.forEach((pair, i) => {
      const colors = painted[i]!;
      results.push({
        ...pair,
        mode,
        ...('missing' in colors
          ? { ratio: 0, missing: colors.missing }
          : {
              ratio:
                Math.floor(contrastRatio(colors.fg!, colors.bg!) * 100) / 100,
            }),
      });
    });
  }

  return results;
}

/** `mode fg on bg` of a result, for known-failure lists */
export const contrastKey = (r: ContrastResult) =>
  `${r.mode} ${r.fg} on ${r.bg}`;
