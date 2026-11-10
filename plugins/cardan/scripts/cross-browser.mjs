#!/usr/bin/env node
/**
 * The browser check of the Cardan review round: one page in Chrome, Firefox
 * and WebKit at the same time, with the same steps, compared in one table.
 * Described in the guidelines skill ("Review Before Commit, Push and PR",
 * step 4).
 *
 *   node cross-browser.mjs <url> [--focus <css>] [--steps <step,step,…>]
 *                                [--snapshot <css>] [--login <email>:<password>]
 *                                [--login-url <url>] [--headed]
 *
 *   --focus     the element to focus before the steps (default: none, so the
 *               first Tab enters the page); the first match must be able to
 *               take focus, or the check stops and says so
 *   --steps     comma-separated: a key as Playwright names it (Tab,
 *               Shift+Tab, Enter, Space, Escape, ArrowDown, …),
 *               `click:<css>` or `hover:<css>`. Default: ten times Tab.
 *               After each, the table shows where focus is and what is open,
 *               with the side of its trigger a popover sits on.
 *   --snapshot  the accessibility tree of this element after the steps, once
 *               when the browsers agree, per browser when they don't
 *   --login     `<email>:<password>`: sign in first, on `--login-url` (default
 *               `/login` on the page's origin), for a page behind sign-in.
 *               Only a local development account.
 *   --browsers  a comma-separated subset of chrome, firefox and webkit, to
 *               check a fix in the browser that failed
 *   --headed    show the browser windows
 *
 * It marks with ≠ the rows where the browsers differ, and saves screenshots
 * per browser at 320px and 1280px wide, and after the steps.
 *
 * Playwright comes from the `@playwright/mcp` version pinned in the plugin's
 * `.mcp.json`, so the check and the Chrome MCP server use the same browsers.
 * Run without it on the PATH, the script starts itself again through npx.
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

/** playwright-core from an npx install of the pinned MCP package on the PATH. */
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
  // A comma starts a new step only before a key (they start with a capital)
  // or `click:`/`hover:`, so a selector may contain commas.
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

/**
 * Where focus is, as `tag[role] "name"`, and what is open on top of the
 * page: a popover with the side of its trigger it sits on and the gap, in
 * steps of 4px so rounding does not count as a difference; a dialog with its
 * size.
 */
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
  const step = (px) => Math.round(px / 4) * 4;

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
    if (box.bottom <= t.top) return `${name} above ${step(t.top - box.bottom)}px`;
    if (box.top >= t.bottom) return `${name} below ${step(box.top - t.bottom)}px`;
    if (box.right <= t.left) return `${name} left ${step(t.left - box.right)}px`;
    if (box.left >= t.right) return `${name} right ${step(box.left - t.right)}px`;
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

/**
 * Signs in on the login page: the first email and password fields, submitted
 * with Enter, done once the page has left the login URL. The session cookie
 * stays with the page for the check.
 */
async function signIn(page) {
  const separator = login.indexOf(':');
  const email = login.slice(0, separator);
  const password = login.slice(separator + 1);
  const target = new URL(loginUrl ?? '/login', url);
  const left = (current) => current.pathname !== target.pathname;

  await page.goto(target.href, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => page.waitForLoadState('load'));
  // A single-page app can still be setting up its form after the page loaded,
  // and clear what was typed: a second try covers that
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

/**
 * The signed-in session, as Playwright storage state that all three browsers
 * load: one sign-in per run at most, in Chrome, since a login throttle (five a
 * minute in Laravel Fortify) turns away a sign-in per browser per run. Kept in
 * the temp folder per origin and account, and reused while the target page
 * does not send it back to the login page.
 */
async function session() {
  const target = new URL(loginUrl ?? '/login', url);
  const file = join(out, `session-${createHash('sha256').update(`${target.origin} ${login}`).digest('hex').slice(0, 12)}.json`);
  const browser = await BROWSERS.Chrome();
  try {
    const context = await browser.newContext(existsSync(file) ? { storageState: file } : {});
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    // An expired session ends on the login page, once the app has checked it
    const expired = await page
      .waitForURL((current) => current.pathname === target.pathname, { timeout: 3_000 })
      .then(() => true, () => false);
    if (expired || !existsSync(file)) {
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
    // Only the page's own errors: not those of the page it replaced, such as
    // the login page's 401 or a load that leaving it aborted
    errors.length = 0;
    // An app that keeps polling never goes idle; it has loaded by then
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
      // A hidden, disabled or plain element ignores focus() without an error,
      // and the steps would start from the top of the page unnoticed
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
        // Tab past the end of the page: each browser starts again elsewhere
        // (Chrome and WebKit at the top, Firefox where it started), so it is
        // not compared. Another step from there, a click, is.
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
