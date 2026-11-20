#!/usr/bin/env node
/**
 * The cross-browser check of the review round (guidelines skill, "Review Before Commit, Push and PR").
 *
 *   node cross-browser.mjs <url> [--focus <css>] [--steps <key|click:<css>|hover:<css>,…>] [--snapshot <css>]
 *                          [--login <email>:<password>] [--login-url <url>] [--browsers <list>] [--headed]
 *
 * Playwright comes from the `@playwright/mcp` pinned in `.mcp.json`, so it uses the MCP server's browsers.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mcpArgs = JSON.parse(readFileSync(join(PLUGIN_ROOT, '.mcp.json'), 'utf8')).mcpServers.playwright.args;
const MCP_PACKAGE = mcpArgs.find((arg) => arg.startsWith('@playwright/mcp@'));

function findPlaywright() {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const core = resolve(dir, '..', 'playwright-core');
    if (dir.endsWith(join('node_modules', '.bin')) && existsSync(join(core, 'package.json'))) {
      const mcp = resolve(dir, '..', '@playwright', 'mcp', 'package.json');
      const version = existsSync(mcp) && JSON.parse(readFileSync(mcp, 'utf8')).version;
      if (MCP_PACKAGE === `@playwright/mcp@${version}`) return createRequire(import.meta.url)(core);
    }
  }
  return undefined;
}

const playwright = findPlaywright();
if (!playwright) {
  if (process.env.CARDAN_CROSS_BROWSER_NPX) {
    console.error(`Could not load playwright-core from ${MCP_PACKAGE}.`);
    process.exit(1);
  }
  const quoted = [fileURLToPath(import.meta.url), ...process.argv.slice(2)]
    .map((arg) => `'${arg.replaceAll("'", "'\\''")}'`)
    .join(' ');
  const result = spawnSync('npx', ['-y', '-p', MCP_PACKAGE, '-c', `node ${quoted}`], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, CARDAN_CROSS_BROWSER_NPX: '1', npm_config_loglevel: 'error' },
  });
  process.exit(result.status ?? 1);
}

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args.splice(index, 2)[1];
};
const headed = args.includes('--headed') && args.splice(args.indexOf('--headed'), 1);
const focus = option('--focus');
const snapshot = option('--snapshot');
const login = option('--login');
const loginUrl = option('--login-url');
const only = option('--browsers')?.toLowerCase().split(',');
const steps = (option('--steps') ?? option('--keys') ?? Array(10).fill('Tab').join(','))
  // Keys start with a capital, so a selector may contain commas.
  .split(/,(?=\s*(?:click:|hover:|[A-Z]))/)
  .map((step) => step.trim())
  .filter(Boolean);
const url = args[0];
if (!url) {
  console.error(
    'Usage: node cross-browser.mjs <url> [--focus <css>] [--steps <step,step,…>] [--snapshot <css>] [--login <email>:<password>] [--login-url <url>] [--browsers <list>] [--headed]',
  );
  process.exit(1);
}

const out = join(tmpdir(), 'cardan-cross-browser');
mkdirSync(out, { recursive: true });

const BROWSERS = {
  Chrome: () => playwright.chromium.launch({ channel: 'chrome', headless: !headed }),
  Firefox: () => playwright.firefox.launch({ headless: !headed }),
  WebKit: () => playwright.webkit.launch({ headless: !headed }),
};

function pageState() {
  const text = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
  const describe = (el) => {
    const labelledBy = el.getAttribute('aria-labelledby');
    const name = text(
      el.getAttribute('aria-label') ||
        (labelledBy && labelledBy.split(' ').map((id) => document.getElementById(id)?.textContent).join(' ')) ||
        el.labels?.[0]?.textContent ||
        el.textContent ||
        el.getAttribute('title') ||
        el.getAttribute('placeholder'),
    ).slice(0, 40);
    const role = el.getAttribute('role');
    return `${el.tagName.toLowerCase()}${role ? `[${role}]` : ''}${name ? ` "${name}"` : ''}`;
  };
  const roundedGap = (px) => Math.round(px / 4) * 4;

  const el = document.activeElement;
  const where = el && el !== document.body ? describe(el) : 'body';

  const open = [...document.querySelectorAll(':popover-open, dialog[open]')].map((layer) => {
    const box = layer.getBoundingClientRect();
    if (layer.tagName === 'DIALOG') {
      return `dialog${layer.id ? `#${layer.id}` : ''} ${Math.round(box.width)}×${Math.round(box.height)}`;
    }
    const name = `popover${layer.id ? `#${layer.id}` : ''}`;
    const trigger =
      (layer.id && document.querySelector(`[popovertarget="${layer.id}"], [aria-controls="${layer.id}"]`)) ||
      (el !== document.body && el);
    if (!trigger) return name;
    const t = trigger.getBoundingClientRect();
    if (box.bottom <= t.top) return `${name} above ${roundedGap(t.top - box.bottom)}px`;
    if (box.top >= t.bottom) return `${name} below ${roundedGap(box.top - t.bottom)}px`;
    if (box.right <= t.left) return `${name} left ${roundedGap(t.left - box.right)}px`;
    if (box.left >= t.right) return `${name} right ${roundedGap(box.left - t.right)}px`;
    return `${name} over the trigger`;
  });
  return open.length ? `${where} · open: ${open.join(', ')}` : where;
}

async function run(page, name, step) {
  const [, action, selector] = /^(click|hover):(.+)$/.exec(step) ?? [];
  if (action === 'click') return page.locator(selector).first().click({ timeout: 5_000 });
  if (action === 'hover') return page.locator(selector).first().hover({ timeout: 5_000 });
  // WebKit, like Safari by default, skips links on Tab; Alt+Tab is Tab with
  // Safari's "Press Tab to highlight each item" turned on.
  return page.keyboard.press(name === 'WebKit' ? step.replace(/(^|\+)Tab$/, '$1Alt+Tab') : step);
}

async function signIn(page) {
  const separator = login.indexOf(':');
  const email = login.slice(0, separator);
  const password = login.slice(separator + 1);
  const target = new URL(loginUrl ?? '/login', url);
  const left = (current) => current.pathname !== target.pathname;

  await page.goto(target.href, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => page.waitForLoadState('load'));
  // An SPA may still reset its form after load, clearing what was typed
  for (let attempt = 0; attempt < 2 && !left(new URL(page.url())); attempt++) {
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(300);
    await emailField.fill(email);
    await passwordField.fill(password);
    await passwordField.press('Enter');
    await page.waitForURL(left, { timeout: 10_000 }).catch(() => {});
  }
  if (!left(new URL(page.url()))) {
    throw new Error(`--login did not leave ${target.pathname}: wrong account, or a second factor`);
  }
}

// One sign-in in Chrome shared by all browsers (Fortify throttles five a minute). A saved one is checked
// on the login page, which sends a signed-in user on; a public target page would not.
async function session() {
  const target = new URL(loginUrl ?? '/login', url);
  const file = join(out, `session-${createHash('sha256').update(`${target.origin} ${login}`).digest('hex').slice(0, 12)}.json`);
  const browser = await BROWSERS.Chrome();
  try {
    const saved = existsSync(file);
    const context = await browser.newContext(saved ? { storageState: file } : {});
    const page = await context.newPage();
    let signedIn = false;
    if (saved) {
      await page.goto(target.href, { waitUntil: 'load', timeout: 30_000 });
      signedIn = await page
        .waitForURL((current) => current.pathname !== target.pathname, { timeout: 5_000 })
        .then(() => true, () => false);
    }
    if (!signedIn) {
      await signIn(page);
      await context.storageState({ path: file });
    }
    return file;
  } finally {
    await browser.close();
  }
}

const storageState = login ? await session().catch((error) => error) : undefined;

async function check(name, launch) {
  let browser;
  try {
    browser = await launch();
  } catch (error) {
    const missing = /Executable doesn't exist|browserType.launch/.test(error.message);
    return {
      name,
      failed: missing
        ? `browser not installed: npx -y -p ${MCP_PACKAGE} playwright-core install ${name.toLowerCase()}`
        : error.message.split('\n')[0],
    };
  }
  try {
    if (storageState instanceof Error) throw storageState;
    return await inspect(name, browser);
  } catch (error) {
    return { name, failed: error.message.split('\n')[0].slice(0, 120) };
  } finally {
    await browser.close();
  }
}

async function inspect(name, browser) {
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, storageState });
    const errors = [];
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: 'commit', timeout: 30_000 });
    // Not the errors of the page it replaced (the login page's 401, an aborted load)
    errors.length = 0;
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => page.waitForLoadState('load'));

    const overflow = async (width) => {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(out, `${name.toLowerCase()}-${width}.png`) });
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      return extra > 0 ? `${extra}px horizontal scroll` : 'fits';
    };
    const at320 = await overflow(320);
    const at1280 = await overflow(1280);

    if (focus) {
      const target = page.locator(focus).first();
      if (!(await target.count())) throw new Error(`--focus ${focus} matches nothing on the page`);
      await target.focus({ timeout: 5_000 });
      if (!(await target.evaluate((el) => el === document.activeElement))) {
        throw new Error(`--focus ${focus} cannot take focus (hidden, disabled or not focusable): name the control itself`);
      }
    }
    const states = [];
    for (const step of steps) {
      try {
        await run(page, name, step);
        await page.waitForTimeout(150);
        // Where Tab past the page's end lands differs per browser by design, so it is not compared
        const left = /(^|\+)Tab$/.test(step) && ['body', 'left the page'].includes(states.at(-1));
        states.push(left ? 'left the page' : await page.evaluate(pageState));
      } catch (error) {
        states.push(`failed: ${error.message.split('\n')[0].slice(0, 80)}`);
      }
    }
    await page.screenshot({ path: join(out, `${name.toLowerCase()}-after.png`) });
    const tree = snapshot
      ? await page.locator(snapshot).first().ariaSnapshot({ timeout: 5_000 }).catch((error) => `failed: ${error.message.split('\n')[0]}`)
      : undefined;
    return { name, at320, at1280, states, tree, errors };
  }
}

const results = await Promise.all(Object.entries(BROWSERS).filter(([name]) => !only || only.includes(name.toLowerCase())).map(([name, launch]) => check(name, launch)));

const cell = (value) => String(value).replaceAll('|', '\\|');
const rows = [
  ['Console errors', results.map((r) => r.failed ?? r.errors.length)],
  ['320px', results.map((r) => r.failed ?? r.at320)],
  ['1280px', results.map((r) => r.failed ?? r.at1280)],
  ...steps.map((step, i) => [`${i + 1}. ${step}`, results.map((r) => r.failed ?? r.states[i])]),
];
console.log(`${url}${focus ? ` · focus ${focus}` : ''}\n`);
console.log(`| | ${results.map((r) => r.name).join(' | ')} |`);
console.log(`|---|${results.map(() => '---').join('|')}|`);
for (const [label, values] of rows) {
  const differs = new Set(values.map(String)).size > 1;
  console.log(`| ${differs ? '≠ ' : ''}${label} | ${values.map(cell).join(' | ')} |`);
}

const webkit = results.findIndex((r) => r.name === 'WebKit');
const clickDiffers = steps.some(
  (step, i) => step.startsWith('click:') && results.some((r, j) => j !== webkit && r.states?.[i] !== results[webkit]?.states?.[i]),
);
if (clickDiffers) {
  console.log(
    '\nWebKit, like Safari on macOS, does not move focus to a button or link that is clicked, so focus ' +
      'differs after a click there. That is the browser, not the change; but a component that relies on ' +
      'that focus (a blur handler, focus returning to it, a key handler on it) behaves differently in Safari.',
  );
}

if (snapshot) {
  const trees = results.filter((r) => r.tree !== undefined);
  if (new Set(trees.map((r) => r.tree)).size <= 1) {
    console.log(`\nAccessibility tree of ${snapshot}, the same in ${trees.map((r) => r.name).join(', ')}:\n${trees[0]?.tree ?? ''}`);
  } else {
    for (const r of trees) console.log(`\n≠ Accessibility tree of ${snapshot} in ${r.name}:\n${r.tree}`);
  }
}

for (const r of results.filter((r) => r.errors?.length)) {
  console.log(`\n${r.name} console errors:`);
  for (const error of r.errors.slice(0, 3)) console.log(`- ${error.split('\n')[0].slice(0, 200)}`);
}
console.log(`\nScreenshots: ${out}/<browser>-<320|1280|after>.png (read one only to see a layout difference)`);
