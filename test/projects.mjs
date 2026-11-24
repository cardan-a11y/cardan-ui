/**
 * `pnpm test:projects`: the suites of the projects that extend the layer,
 * each against this checkout, before a release. Per project it tests the
 * checkout on the branch it is on, and each worktree beside it whose branch
 * is not yet in the project's `develop` (or `main`). One at a time, it runs
 * `test:layer` and, once that passes, `test:browser` (Playwright, on the
 * project's own port), prints each result per suite with its branch, names
 * the unmerged local branches it did not test, and exits non-zero when a
 * suite failed.
 *
 *   node test/projects.mjs [--skip-browser] [--branch <name>] [folder, default ..]
 *
 * --skip-browser   runs only the `test:layer` suites, for a quick run
 * --branch <name>  tests that branch in each project that has it: in its
 *                  worktree, or checked out in the checkout and switched back
 *                  afterwards; a checkout with uncommitted changes is left
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The one list of projects, which the token test and the contrast spec read too
const PROJECTS = JSON.parse(
  readFileSync(new URL('./projects.json', import.meta.url), 'utf8'),
).map(({ folder }) => folder);

const SKIP_BROWSER = '--skip-browser';
const BRANCH = '--branch';

const args = process.argv.slice(2);
const branchAt = args.indexOf(BRANCH);
const wanted = branchAt === -1 ? undefined : args[branchAt + 1];
if (branchAt !== -1) {
  if (!wanted || wanted.startsWith('--')) {
    console.error(`${BRANCH} needs a branch name`);
    process.exit(2);
  }
  args.splice(branchAt, 2);
}
const unknown = args.filter(
  (arg) => arg.startsWith('--') && arg !== SKIP_BROWSER,
);
if (unknown.length) {
  console.error(
    `Unknown option ${unknown.join(', ')}; the options are ${SKIP_BROWSER} and ${BRANCH} <name>`,
  );
  process.exit(2);
}
const skipBrowser = args.includes(SKIP_BROWSER);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const folder = resolve(
  args.find((arg) => !arg.startsWith('--')) ?? join(root, '..'),
);

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

function git(dir, ...gitArgs) {
  const { status, stdout } = spawnSync('git', ['-C', dir, ...gitArgs], {
    encoding: 'utf8',
  });
  return status === 0 ? stdout.trim() : undefined;
}

const baseOf = (dir) =>
  ['origin/develop', 'origin/main'].find((ref) =>
    git(dir, 'rev-parse', '--verify', '--quiet', ref),
  );

/** Also true after a squash merge: merging `ref` into `base` would change nothing */
function isIn(dir, ref, base) {
  if (git(dir, 'merge-base', '--is-ancestor', ref, base) !== undefined) {
    return true;
  }
  const merged = git(dir, 'merge-tree', '--write-tree', base, ref);
  return merged?.split('\n')[0] === git(dir, 'rev-parse', `${base}^{tree}`);
}

function worktreesOf(dir) {
  const list = git(dir, 'worktree', 'list', '--porcelain') ?? '';
  return list.split('\n\n').map((entry) => ({
    dir: entry.match(/^worktree (.+)$/m)?.[1],
    branch: entry.match(/^branch refs\/heads\/(.+)$/m)?.[1],
  }));
}

/** Local branches not yet merged, newest first */
function unmergedBranches(dir, base) {
  const refs = git(
    dir,
    'for-each-ref',
    '--sort=-committerdate',
    '--format=%(refname:short)',
    'refs/heads',
  );
  return (refs ? refs.split('\n') : []).filter(
    (branch) => !isIn(dir, branch, base),
  );
}

const hasBranch = (dir, branch) =>
  git(dir, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`) !==
    undefined ||
  git(
    dir,
    'rev-parse',
    '--verify',
    '--quiet',
    `refs/remotes/origin/${branch}`,
  ) !== undefined;

const hasTrackedChanges = (dir) =>
  Boolean(git(dir, 'status', '--porcelain', '--untracked-files=no'));

/** Keeps node alive on Ctrl+C, so `run()` sees the suite stop and switches back */
process.on('SIGINT', () => {});

/** The checkout to switch back, also after Ctrl+C stops a suite */
let switched;
function switchBack() {
  if (!switched) return;
  const { dir, from, install } = switched;
  switched = undefined;
  console.log(`\n↩ ${dir}: back to ${from}\n`);
  git(dir, 'switch', from);
  if (install)
    spawnSync('pnpm', ['install', '--frozen-lockfile'], {
      cwd: dir,
      stdio: 'inherit',
    });
}

/** Checks out `branch` in the checkout and tests it, then switches back */
function testSwitched(project, dir, from, branch) {
  if (hasTrackedChanges(dir)) {
    return {
      name: `${project} (${branch})`,
      layer: `not tested: uncommitted changes on ${from}`,
      browser: '-',
    };
  }
  console.log(`\n↪ ${dir}: ${from} → ${branch}\n`);
  if (git(dir, 'switch', branch) === undefined) {
    return {
      name: `${project} (${branch})`,
      layer: 'switch failed',
      browser: '-',
    };
  }
  const install =
    git(dir, 'diff', '--quiet', from, branch, '--', 'pnpm-lock.yaml') ===
    undefined;
  switched = { dir, from, install };
  if (install)
    spawnSync('pnpm', ['install', '--frozen-lockfile'], {
      cwd: dir,
      stdio: 'inherit',
    });
  try {
    return test(`${project} (${branch})`, dir);
  } finally {
    switchBack();
  }
}

function run(name, dir, script) {
  console.log(`\n▶ ${name}: pnpm run ${script}\n`);
  const { status, signal } = spawnSync('pnpm', ['run', script], {
    cwd: dir,
    stdio: 'inherit',
  });
  if (signal === 'SIGINT') {
    switchBack();
    process.exit(130);
  }
  return status === 0 ? 'passed' : 'failed';
}

function test(name, dir) {
  const scripts = scriptsOf(dir);
  const has = (script) => typeof scripts[script] === 'string';

  const layer = has('test:layer') ? run(name, dir, 'test:layer') : 'no suite';

  let browser;
  if (!has('test:browser')) browser = 'no suite';
  else if (skipBrowser) browser = `skipped (${SKIP_BROWSER})`;
  else if (layer === 'failed') browser = 'skipped (test:layer failed)';
  else browser = run(name, dir, 'test:browser');

  return { name, layer, browser };
}

const untested = [];
const results = PROJECTS.flatMap((project) => {
  const dir = join(folder, project);
  if (!existsSync(dir)) {
    return [
      { name: project, layer: 'not checked out', browser: 'not checked out' },
    ];
  }
  const base = baseOf(dir);
  const [checkout, ...others] = worktreesOf(dir);

  const switchTo =
    wanted &&
    checkout.branch &&
    checkout.branch !== wanted &&
    hasBranch(dir, wanted) &&
    !others.some(({ branch }) => branch === wanted)
      ? wanted
      : undefined;

  const waiting = others.filter(
    (worktree) =>
      worktree.branch &&
      dirname(resolve(worktree.dir)) === folder &&
      base &&
      !isIn(worktree.dir, 'HEAD', base),
  );
  const tested = [switchTo ?? checkout.branch, ...waiting.map((w) => w.branch)];
  const left = base
    ? unmergedBranches(dir, base).filter((branch) => !tested.includes(branch))
    : [];
  if (left.length) untested.push(`${project}: ${left.join(', ')}`);

  return [
    switchTo
      ? testSwitched(project, dir, checkout.branch, switchTo)
      : test(`${project} (${checkout.branch ?? 'detached'})`, dir),
    ...waiting.map((worktree) =>
      test(`${project} (${worktree.branch}, worktree)`, worktree.dir),
    ),
  ];
});

const width = Math.max(...results.map(({ name }) => name.length));
console.log('');
for (const { name, layer, browser } of results) {
  console.log(
    `${name.padEnd(width)}  test:layer: ${layer.padEnd(15)}  test:browser: ${browser}`,
  );
}

if (untested.length) {
  console.log(
    '\nUnmerged local branches not tested (check one out to test it):',
  );
  for (const line of untested) console.log(`  ${line}`);
}

const failed = results.some(
  (r) =>
    r.layer === 'failed' ||
    r.browser === 'failed' ||
    r.layer.startsWith('not tested') ||
    r.layer === 'switch failed',
);
process.exit(failed ? 1 : 0);
