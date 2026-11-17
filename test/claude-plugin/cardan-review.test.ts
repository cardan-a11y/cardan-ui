// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The review gate of the cardan Claude Code plugin
 * (plugins/cardan/hooks/cardan-review.mjs) lets through a push that sends
 * only commits already on origin/main or origin/develop, also with a
 * redirection after it, and blocks one that sends a new commit.
 */
const HOOK = resolve('plugins/cardan/hooks/cardan-review.mjs');

// Without the developer's git config (signing, hooks), for git and the hook
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
};

let dir: string;
let repo: string;

function git(...args: string[]) {
  execFileSync('git', args, { cwd: repo, env, stdio: 'ignore' });
}

/** The gate's exit code for this command: 0 lets it through, 2 blocks it */
function gate(command: string) {
  return spawnSync('node', [HOOK, 'gate'], {
    input: JSON.stringify({ tool_input: { command }, cwd: repo }),
    env: { ...env, CLAUDE_PROJECT_DIR: repo },
  }).status;
}

// A fresh clone per case, level with its origin
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cardan-review-test-'));
  const origin = join(dir, 'origin.git');
  repo = join(dir, 'repo');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin], { env });
  execFileSync('git', ['clone', '-q', origin, repo], { env, stdio: 'ignore' });
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  writeFileSync(join(repo, 'REVIEW.md'), '# Review\n');
  writeFileSync(join(repo, 'app.ts'), 'export {};\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'Start');
  git('push', '-q', 'origin', 'main');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('cardan-review gate', () => {
  it.each([
    'git push origin main',
    'git push origin main 2>&1 | tail -2',
    'git push origin origin/main:develop 2>&1',
    'git push origin main &>/dev/null',
    'git push origin main > push.log 2>&1',
    'git push origin main>/dev/null',
    'git push origin main >| push.log',
    'git push origin main >& push.log',
    'git push origin main < /dev/null',
    'git push origin main 2>&-',
  ])('lets through a push of commits on origin/main: %s', (command) => {
    expect(gate(command)).toBe(0);
  });

  it.each(['git push origin main', 'git push origin main 2>&1 | tail -2', 'git push origin main>/dev/null'])(
    'blocks a push of a commit that is not on origin/main: %s',
    (command) => {
      writeFileSync(join(repo, 'app.ts'), 'export const changed = true;\n');
      git('commit', '-q', '-am', 'Change');
      expect(gate(command)).toBe(2);
    },
  );
});
