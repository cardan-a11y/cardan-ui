/**
 * `pnpm test:projects`: the suites of the projects that extend the layer,
 * each against this checkout, before a release. For each sibling checkout,
 * one project at a time, it runs the project's `test:layer` script and,
 * once that passes, its `test:browser` script (Playwright, on the project's
 * own port). It then prints each project's result per suite (passed,
 * failed, no suite, not checked out, or skipped and why) and exits non-zero
 * when a suite failed. A project without a script has no such suite; the
 * browser suite also runs for a project that has no `test:layer`.
 *
 *   node test/projects.mjs [--skip-browser] [folder that holds the checkouts, default ..]
 *
 * --skip-browser  runs only the `test:layer` suites, for a quick run
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECTS = [
  'cardan-academy-nuxt',
  'cardan-auditor-nuxt',
  'cardan-cms-nuxt',
  'cardan-support-nuxt',
];

const SKIP_BROWSER = '--skip-browser';

const args = process.argv.slice(2);
const unknown = args.filter(
  (arg) => arg.startsWith('--') && arg !== SKIP_BROWSER,
);
if (unknown.length) {
  console.error(
    `Unknown option ${unknown.join(', ')}; the one option is ${SKIP_BROWSER}`,
  );
  process.exit(2);
}
const skipBrowser = args.includes(SKIP_BROWSER);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = resolve(
  args.find((arg) => !arg.startsWith('--')) ?? join(root, '..'),
);

/** The scripts in the project's package.json, empty without one */
function scriptsOf(dir) {
  try {
    const { scripts } = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf8'),
    );
    return scripts ?? {};
  } catch {
    return {};
  }
}

/** Runs the project's script, with its output on this terminal */
function run(name, dir, script) {
  console.log(`\n▶ ${name}: pnpm run ${script}\n`);
  const { status } = spawnSync('pnpm', ['run', script], {
    cwd: dir,
    stdio: 'inherit',
  });
  return status === 0 ? 'passed' : 'failed';
}

const results = PROJECTS.map((name) => {
  const dir = join(folder, name);
  if (!existsSync(dir)) {
    return { name, layer: 'not checked out', browser: 'not checked out' };
  }

  const scripts = scriptsOf(dir);
  const has = (script) => typeof scripts[script] === 'string';

  const layer = has('test:layer') ? run(name, dir, 'test:layer') : 'no suite';

  let browser;
  if (!has('test:browser')) browser = 'no suite';
  else if (skipBrowser) browser = `skipped (${SKIP_BROWSER})`;
  else if (layer === 'failed') browser = 'skipped (test:layer failed)';
  else browser = run(name, dir, 'test:browser');

  return { name, layer, browser };
});

const width = Math.max(...PROJECTS.map((name) => name.length));
console.log('');
for (const { name, layer, browser } of results) {
  console.log(
    `${name.padEnd(width)}  test:layer: ${layer.padEnd(15)}  test:browser: ${browser}`,
  );
}

const failed = results.some(
  (r) => r.layer === 'failed' || r.browser === 'failed',
);
process.exit(failed ? 1 : 0);
