// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * The review gate of the cardan Claude Code plugin
 * (plugins/cardan/hooks/cardan-review.mjs) lets through a push that sends
 * only commits already on origin/main or origin/develop, also with a
 * redirection after it, and blocks one that sends a new commit. A review the
 * reviewer names for a worktree of the session's repository counts, also one
 * under `.claude/worktrees/`.
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

/** The hook's exit code for this step and input */
function hook(step: string, input: object) {
  return spawnSync('node', [HOOK, step], {
    input: JSON.stringify(input),
    env: { ...env, CLAUDE_PROJECT_DIR: repo },
  }).status;
}

/** The gate's exit code for this command: 0 lets it through, 2 blocks it */
function gate(command: string) {
  return hook('gate', { tool_input: { command }, cwd: repo });
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

  it('lets through a commit in a worktree under .claude/worktrees/ that a reviewer named', () => {
    const worktree = join(repo, '.claude', 'worktrees', 'fix');
    git('worktree', 'add', '-q', '-b', 'fix', worktree);
    writeFileSync(join(worktree, 'app.ts'), 'export const changed = true;\n');
    const command = `cd ${worktree} && git commit -qam Change`;
    expect(gate(command)).toBe(2);

    // The session started in the main checkout, as EnterWorktree leaves it
    const reviewer = { agent_type: 'cardan:cardan-reviewer', cwd: repo };
    hook('start', reviewer);
    hook('mark', {
      ...reviewer,
      last_assistant_message: `0 important\n\nReviewed repository: ${realpathSync(worktree)}`,
    });
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
