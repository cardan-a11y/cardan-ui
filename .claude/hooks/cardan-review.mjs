#!/usr/bin/env node
/**
 * The local review of the Cardan Nuxt projects, described in
 * .claude/rules/cardan-guidelines.md. cardan-ui holds the original of this
 * file; cardan-lms-nuxt, cardan-auditor-nuxt, cardan-cms-nuxt and
 * cardan-support-nuxt hold an exact copy. Edit it in cardan-ui only.
 *
 *   gate   PreToolUse on Bash: blocks `git commit`, `git push` and
 *          `gh pr create` until the cardan-reviewer agent has reviewed the
 *          files exactly as they are now. In cardan-ui it also blocks while
 *          the copies in the projects next to it differ from the originals.
 *   start  SubagentStart of cardan-reviewer: notes the state it reviews.
 *   mark   SubagentStop of cardan-reviewer: records that state as reviewed,
 *          unless a file changed while the review ran.
 *   drift  SessionStart: tells Claude when the shared files here and in
 *          cardan-ui (when it is checked out next to this one) differ.
 *   sync   By hand in cardan-ui (scripts/sync-claude-guidelines.sh): copies
 *          the shared files to the projects next to it. `sync --check`
 *          only reports the differences and exits with 1 when there are any.
 */

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

/** The files cardan-ui shares with the projects, byte for byte. */
const SHARED_FILES = [
  '.claude/rules/cardan-guidelines.md',
  '.claude/agents/cardan-reviewer.md',
  '.claude/hooks/cardan-review.mjs',
  '.claude/settings.json',
];

const ORIGIN = 'cardan-ui';
const PROJECTS = [
  'cardan-lms-nuxt',
  'cardan-auditor-nuxt',
  'cardan-cms-nuxt',
  'cardan-support-nuxt',
];

/**
 * `git commit`, `git push` or `gh pr create` where a command starts: at the
 * start of a line or after `;`, `&`, `|` or `(`, `then` or `do`, optionally
 * behind variable assignments and git's global options (`-C <dir>`,
 * `-c <key=value>`, `--no-pager`, …). Not as text inside an argument, such
 * as a commit message or a grep pattern.
 */
const REVIEW_COMMAND =
  /(?:^|[;&|(]|\bthen\b|\bdo\b)\s*(?:\w+=\S*\s+)*(?:git\s+(?:(?:-C\s+("[^"]*"|'[^']*'|\S+)|-c\s+\S+|--[\w-]+(?:=\S+)?)\s+)*(?:commit|push)(?![\w-])|gh\s+pr\s+create\b)/m;
const SKIP = /\bSKIP_REVIEW=1\b/;

/** A `cd` where a command starts, with its (possibly quoted) target. */
const CD = /(?:^|[;&|(]|\bthen\b|\bdo\b)\s*cd\s+("[^"]*"|'[^']*'|[^\s;&|)]+)/gm;

/** A shell path argument without its quotes, with `~` expanded. */
function shellPath(argument) {
  return argument.replace(/^(["'])(.*)\1$/, '$2').replace(/^~(?=\/|$)/, homedir());
}

/**
 * The directory a command runs in at position `end` of `command`, after
 * the `cd`s before it: `cd cardan-lms-nuxt && git commit` commits in
 * cardan-lms-nuxt, not in the directory the session started in.
 */
function directoryAt(command, end, cwd) {
  let dir = cwd;
  for (const [, target] of command.slice(0, end).matchAll(CD)) {
    dir = resolve(dir, shellPath(target));
  }
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/** The GitHub name of the repository at `dir`, or undefined. */
function repositoryName(dir) {
  try {
    const remote = git(dir, 'remote', 'get-url', 'origin');
    return remote.includes('cardan-a11y/') ? basename(remote, '.git') : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A fingerprint of every file in the working tree that git does not ignore,
 * committed or not: the tree git would write if all of it were staged. It
 * does not change by committing, only by changing a file.
 */
function workingTree(root) {
  const index = resolve(root, git(root, 'rev-parse', '--git-path', 'index'));
  const temporaryIndex = join(tmpdir(), `cardan-review-${process.pid}`);
  if (existsSync(index)) copyFileSync(index, temporaryIndex);
  const env = { ...process.env, GIT_INDEX_FILE: temporaryIndex };

  try {
    execFileSync('git', ['add', '-A'], { cwd: root, env, stdio: 'ignore' });
    return execFileSync('git', ['write-tree'], { cwd: root, env, encoding: 'utf8' }).trim();
  } finally {
    rmSync(temporaryIndex, { force: true });
  }
}

function markerPath(root) {
  return resolve(root, git(root, 'rev-parse', '--git-path', 'cardan-review'));
}

/** The Cardan checkouts next to `root`, by GitHub name. */
function siblings(root) {
  const found = new Map();
  const parent = dirname(root);
  for (const entry of readdirSync(parent, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(parent, entry.name);
    const name = repositoryName(dir);
    if (name && !found.has(name)) found.set(name, dir);
  }
  return found;
}

function read(file) {
  return existsSync(file) ? readFileSync(file) : undefined;
}

/** The shared files that differ between the cardan-ui checkout and `dir`. */
function differences(originDir, dir) {
  return SHARED_FILES.filter((file) => {
    const original = read(join(originDir, file));
    const copy = read(join(dir, file));
    return !original || !copy || !original.equals(copy);
  });
}

/** For cardan-ui: the projects next to it whose copies differ. */
function outdatedProjects(originDir) {
  const checkouts = siblings(originDir);
  return PROJECTS.filter((name) => checkouts.has(name))
    .map((name) => ({ name, dir: checkouts.get(name), files: differences(originDir, checkouts.get(name)) }))
    .filter(({ files }) => files.length);
}

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function block(message) {
  process.stderr.write(message + '\n');
  process.exit(2);
}

function gate() {
  const input = readInput();
  const command = input.tool_input?.command ?? '';
  const match = REVIEW_COMMAND.exec(command);
  if (!match || SKIP.test(command)) return;

  const cwd = directoryAt(
    command,
    match.index,
    input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  );
  let root;
  try {
    root = git(resolve(cwd, shellPath(match[1] ?? '.')), 'rev-parse', '--show-toplevel');
  } catch {
    return;
  }
  if (!existsSync(join(root, 'REVIEW.md'))) return;

  const session = sessionRoot(input);
  if (root !== session) {
    block(
      `Blocked: this Claude session started in ${session ?? 'a folder outside a repository'} ` +
        `and records reviews only for that repository. Commit, push or open the PR in ${root} ` +
        'from a Claude session started there. Only when the user explicitly said to skip the ' +
        'review for this change, put SKIP_REVIEW=1 in front of the command.',
    );
  }

  if (repositoryName(root) === ORIGIN) {
    const outdated = outdatedProjects(root);
    if (outdated.length) {
      block(
        'Blocked: the shared Claude files in ' +
          outdated.map(({ name }) => name).join(', ') +
          ' differ from cardan-ui. Run scripts/sync-claude-guidelines.sh in cardan-ui, ' +
          'tell the user which projects now have changes to commit, then try again.',
      );
    }
  }

  const marker = read(markerPath(root))?.toString().trim();
  if (marker !== workingTree(root)) {
    block(
      'Blocked: the files as they are now have not been reviewed. Run the ' +
        'cardan-reviewer agent as described in .claude/rules/cardan-guidelines.md ' +
        '("Review Before Commit, Push and PR"); it records the reviewed state when ' +
        'it finishes, and any change after that needs a new review. Only when the ' +
        'user explicitly said to skip the review for this change, put SKIP_REVIEW=1 ' +
        'in front of the command.',
    );
  }
}

/**
 * The repository the session started in. Reviews are recorded for it only,
 * so a review of one repository can never count for another.
 */
function sessionRoot(input) {
  try {
    return git(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd(), 'rev-parse', '--show-toplevel');
  } catch {
    return undefined;
  }
}

/** SubagentStart of cardan-reviewer: the state the review starts from. */
function start() {
  const input = readInput();
  if (input.agent_type !== 'cardan-reviewer') return;

  const root = sessionRoot(input);
  if (!root) return;
  writeFileSync(markerPath(root) + '-start', workingTree(root) + '\n');
}

/**
 * The reviewer's report. SubagentStop passes it as `last_assistant_message`
 * when the reviewer ends with text (the terminal). Where it hands the report
 * back with a tool call instead (the VS Code extension), that field is
 * missing or holds other text, and the report is the call's `message` in
 * the agent's transcript, which can be written a moment after the hook
 * starts: wait for it, for up to ten seconds, and fall back to the last
 * text the reviewer wrote.
 */
function report(input) {
  const given = input.last_assistant_message ?? '';
  if (/^Reviewed repository: /m.test(given)) return given;

  const path = input.agent_transcript_path ?? '';
  if (!path) return given;
  const deadline = Date.now() + 10_000;

  for (;;) {
    let text = '';
    for (const line of read(path)?.toString().split('\n').reverse() ?? []) {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (entry?.type !== 'assistant') continue;

      const content = entry.message?.content;
      const parts = Array.isArray(content) ? content : [];
      const handback = parts.find((part) => part.type === 'tool_use' && part.name === 'SubagentHandback');
      if (handback) return String(handback.input?.message ?? '');
      text ||= parts.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
    }
    if (Date.now() >= deadline) return text;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
}

/**
 * SubagentStop of cardan-reviewer: records the state as reviewed, but only
 * when the reviewer names the session's repository on its last line and no
 * file changed while the review ran.
 */
function mark() {
  const input = readInput();
  if (input.agent_type !== 'cardan-reviewer') return;

  const root = sessionRoot(input);
  if (!root) return;
  const startFile = markerPath(root) + '-start';

  const named = /^Reviewed repository: (.+)$/m.exec(report(input))?.[1].trim();
  let reviewed;
  try {
    reviewed = named && git(shellPath(named), 'rev-parse', '--show-toplevel');
  } catch {
    reviewed = undefined;
  }
  if (reviewed !== root) {
    rmSync(startFile, { force: true });
    process.stderr.write(
      `cardan-review: the reviewer did not name ${root} as the reviewed repository, so the review was not recorded.\n`,
    );
    return;
  }

  const started = read(startFile)?.toString().trim();
  rmSync(startFile, { force: true });

  const tree = workingTree(root);
  if (started === tree) {
    writeFileSync(markerPath(root), tree + '\n');
  } else {
    process.stderr.write(
      'cardan-review: files changed while the review ran, so it was not recorded; review again.\n',
    );
  }
}

function drift() {
  const root = git(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), 'rev-parse', '--show-toplevel');

  if (repositoryName(root) === ORIGIN) {
    const outdated = outdatedProjects(root);
    if (outdated.length) {
      console.log(
        'The shared Claude files of ' +
          outdated.map(({ name, files }) => `${name} (${files.join(', ')})`).join('; ') +
          ' differ from cardan-ui. Tell the user, and offer to run scripts/sync-claude-guidelines.sh.',
      );
    }
    return;
  }

  const originDir = siblings(root).get(ORIGIN);
  if (!originDir) return;
  const files = differences(originDir, root);
  if (files.length) {
    console.log(
      `The shared Claude files ${files.join(', ')} differ from the cardan-ui checkout at ${originDir}. ` +
        'Tell the user: either this copy is outdated (run scripts/sync-claude-guidelines.sh in ' +
        'cardan-ui) or cardan-ui is on a branch with unmerged changes. Never edit the copies here.',
    );
  }
}

function sync(check) {
  const originDir = git(process.cwd(), 'rev-parse', '--show-toplevel');
  if (repositoryName(originDir) !== ORIGIN) {
    console.error('Run this in cardan-ui.');
    process.exit(1);
  }

  const checkouts = siblings(originDir);
  let differ = false;

  for (const name of PROJECTS) {
    const dir = checkouts.get(name);
    if (!dir) {
      console.log(`${name}: no checkout next to cardan-ui, skipped`);
      continue;
    }
    const files = differences(originDir, dir);
    if (!files.length) {
      console.log(`${name}: up to date`);
    } else if (check) {
      console.log(`${name}: differs from cardan-ui (${files.join(', ')})`);
      differ = true;
    } else {
      for (const file of files) {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        copyFileSync(join(originDir, file), join(dir, file));
      }
      console.log(`${name}: updated ${files.join(', ')}; commit them in that repository`);
    }
  }

  if (differ) process.exit(1);
}

const [command, option] = process.argv.slice(2);

try {
  if (command === 'gate') gate();
  else if (command === 'start') start();
  else if (command === 'mark') mark();
  else if (command === 'drift') drift();
  else if (command === 'sync') sync(option === '--check');
  else {
    console.error('Usage: cardan-review.mjs gate | start | mark | drift | sync [--check]');
    process.exit(1);
  }
} catch (error) {
  // A hook that fails on its own must not block Claude; report and let it pass.
  if (command === 'sync') throw error;
  process.stderr.write(`cardan-review ${command}: ${error.message}\n`);
}
