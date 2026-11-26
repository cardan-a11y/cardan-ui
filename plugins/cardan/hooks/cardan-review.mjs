#!/usr/bin/env node
/**
 * The review gate of the guidelines skill ("Review Before Commit, Push and PR").
 *
 *   gate        PreToolUse on Bash: blocks commit, push and PR until a reviewer recorded the current files
 *   start       SubagentStart of a reviewer: notes the state of each candidate repository
 *   mark        SubagentStop of a reviewer: records the repository it names as reviewed
 *   guidelines  SessionStart: prints the guidelines into the session's context
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEWER = /^(cardan:)?(cardan|plugin)-reviewer$/;
const PLUGIN_REVIEWER = /^(cardan:)?plugin-reviewer$/;

// `git commit`, `git push` (after git's global options) or `gh pr create` where a command
// starts, not as text inside an argument such as a commit message.
const REVIEW_COMMAND =
  /(?:^|[;&|(]|\bthen\b|\bdo\b)\s*(?:\w+=\S*\s+)*(?:git\s+(?:(?:-C\s+("[^"]*"|'[^']*'|\S+)|-c\s+\S+|--[\w-]+(?:=\S+)?)\s+)*(?:commit|push)(?![\w-])|gh\s+pr\s+create\b)/m;
const SKIP = /\bSKIP_REVIEW=1\b/;

const CD = /(?:^|[;&|(]|\bthen\b|\bdo\b)\s*cd\s+("[^"]*"|'[^']*'|[^\s;&|)]+)/gm;

function shellPath(argument) {
  return argument.replace(/^(["'])(.*)\1$/, '$2').replace(/^~(?=\/|$)/, homedir());
}

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

function repositoryName(dir) {
  try {
    const remote = git(dir, 'remote', 'get-url', 'origin');
    return remote.includes('cardan-a11y/') ? basename(remote, '.git') : undefined;
  } catch {
    return undefined;
  }
}

// The tree `git add -A` would write: changes with any file, not with a commit.
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

function nearestRemote(root) {
  let nearest;
  for (const ref of ['@{upstream}', 'origin/develop', 'origin/main', 'origin/HEAD']) {
    let count;
    try {
      count = Number(git(root, 'rev-list', '--count', `${ref}..HEAD`));
    } catch {
      continue;
    }
    if (nearest === undefined || count < nearest.count) nearest = { ref, count };
  }
  return nearest?.ref;
}

function isInstructions(file) {
  return /(^|\/)(CLAUDE|REVIEW)\.md$/.test(file);
}

function isDocumentation(file) {
  return /\.md$/i.test(file) && !/^(plugins|\.claude)\//.test(file) && !isInstructions(file);
}

function markdownOnly(root) {
  try {
    const files = new Set();
    const add = (output) => output.split('\n').filter(Boolean).forEach((file) => files.add(file));
    add(git(root, 'diff', '--name-only', 'HEAD'));
    add(git(root, 'ls-files', '--others', '--exclude-standard'));
    const remote = nearestRemote(root);
    if (remote) add(git(root, 'diff', '--name-only', `${remote}...HEAD`));
    return files.size > 0 && [...files].every(isDocumentation);
  } catch {
    return false;
  }
}

function isSetup(file) {
  return /^(plugins|\.claude-plugin|\.claude)\//.test(file) || isInstructions(file);
}

function setupOnly(root) {
  try {
    const files = [
      ...git(root, 'diff', '--name-only', 'HEAD').split('\n'),
      ...git(root, 'ls-files', '--others', '--exclude-standard').split('\n'),
    ].filter(Boolean);
    return files.length > 0 && files.every((file) => isSetup(file) || isDocumentation(file));
  } catch {
    return false;
  }
}

function pushedBranch(root) {
  try {
    const branch = git(root, 'symbolic-ref', '--short', 'HEAD');
    const pushed =
      git(root, 'rev-parse', 'HEAD') === git(root, 'rev-parse', `origin/${branch}`) &&
      workingTree(root) === git(root, 'rev-parse', 'HEAD^{tree}');
    return pushed ? branch : undefined;
  } catch {
    return undefined;
  }
}

// Removed because, if kept, the `&` of `2>&1` would end the command and `2>` read as
// a refspec. Other forms (a here-document, `<(…)`) block or git refuses them.
function withoutRedirections(text) {
  return text.replace(/(?:(?<=\s)(?:\d+|&))?(?:>[>|&]?|<)\s*[^\s;&|)<>]+/g, ' ');
}

const PUSH_OPTIONS = /^(-u|--set-upstream|-q|--quiet|-v|--verbose)$/;

function pushSources(args) {
  const words = args.trim().split(/\s+/).filter(Boolean);
  if (words.some((word) => /["'`$]/.test(word))) return undefined;
  if (words.some((word) => word.startsWith('-') && !PUSH_OPTIONS.test(word))) return undefined;

  const [remote, ...refspecs] = words.filter((word) => !word.startsWith('-'));
  if (remote !== undefined && remote !== 'origin') return undefined;
  if (refspecs.length === 0) return ['HEAD'];

  const sources = refspecs.map((refspec) => refspec.split(':')[0]);
  return sources.every(Boolean) ? sources : undefined;
}

function onIntegrationBranch(root, source) {
  return ['origin/main', 'origin/develop'].some((ref) => {
    try {
      git(root, 'merge-base', '--is-ancestor', source, ref);
      return true;
    } catch {
      return false;
    }
  });
}

function nothingNew(root, matched, argsAfter) {
  if (/\bgh\s+pr\s+create\b/.test(matched)) return pushedBranch(root) !== undefined;
  if (!/\bpush$/.test(matched)) return false;

  const sources = pushSources(argsAfter);
  return sources !== undefined && sources.every((source) => onIntegrationBranch(root, source));
}

function read(file) {
  return existsSync(file) ? readFileSync(file) : undefined;
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

  // In a chain a later command could run in another state or repository than the one checked.
  const single = command.match(new RegExp(REVIEW_COMMAND.source, 'gm')).length === 1;
  const rest = withoutRedirections(command.slice(match.index + match[0].length)).split(/[;&|)\n]/)[0];
  if (single && (markdownOnly(root) || nothingNew(root, match[0], rest))) return;

  const marker = read(markerPath(root))?.toString().trim();
  if (marker !== workingTree(root)) {
    block(
      'Blocked: the files as they are now have not been reviewed. Run the ' +
        'cardan:cardan-reviewer agent as described in the Cardan guidelines ("Review Before ' +
        'Commit, Push and PR"), or the cardan:plugin-reviewer agent for a change to plugins/, ' +
        '.claude-plugin/, .claude/, CLAUDE.md or REVIEW.md alone; it records the reviewed state when it ' +
        'finishes, and any change after that needs a new review. Only a change to documentation alone ' +
        '(Markdown outside plugins/ and .claude/, other than CLAUDE.md and REVIEW.md), a PR from a branch with nothing uncommitted or unpushed, and a ' +
        'push that sends only commits already on origin/main or origin/develop need none, each ' +
        'as a command of its own. ' +
        'Only when the user explicitly said to skip the review for this change, put ' +
        'SKIP_REVIEW=1 in front of the command.',
    );
  }
}

function sessionRoot(input) {
  try {
    return git(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd(), 'rev-parse', '--show-toplevel');
  } catch {
    return undefined;
  }
}

// The session's repository and the Cardan ones (with a REVIEW.md) next to it, with their worktrees:
// SubagentStart does not say which the reviewer reviews, so `start` notes each and `mark` records
// the one it names.
function candidateRoots(input) {
  const session = sessionRoot(input);
  const roots = new Set(session ? [session] : []);
  const parent = dirname(session ?? resolve(input.cwd ?? process.cwd()));

  let entries = [];
  try {
    entries = readdirSync(parent, { withFileTypes: true });
  } catch {
    // Unreadable parent: the session's repository only.
  }
  for (const entry of entries) {
    const dir = join(parent, entry.name);
    if (!entry.isDirectory() || !existsSync(join(dir, 'REVIEW.md'))) continue;
    try {
      roots.add(git(dir, 'rev-parse', '--show-toplevel'));
    } catch {
      // Not a git repository.
    }
  }

  // Their worktrees too, wherever they are: EnterWorktree puts one in `.claude/worktrees/`
  for (const root of [...roots]) {
    for (const dir of worktrees(root)) {
      if (!existsSync(join(dir, 'REVIEW.md'))) continue;
      try {
        roots.add(git(dir, 'rev-parse', '--show-toplevel'));
      } catch {
        // Its link to the repository is broken, e.g. after the repository moved.
      }
    }
  }
  return [...roots];
}

function worktrees(root) {
  try {
    return git(root, 'worktree', 'list', '--porcelain')
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length));
  } catch {
    return [];
  }
}

function start() {
  const input = readInput();
  if (!REVIEWER.test(input.agent_type ?? '')) return;

  for (const root of candidateRoots(input)) {
    try {
      writeFileSync(markerPath(root) + '-start', workingTree(root) + '\n');
    } catch {
      // Unreadable: never recorded as reviewed.
    }
  }
}

// Where the reviewer hands back with a tool call (VS Code extension), `last_assistant_message`
// lacks the report and the transcript may get it after the hook starts: wait up to 10s for it.
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

function mark() {
  const input = readInput();
  if (!REVIEWER.test(input.agent_type ?? '')) return;

  const candidates = candidateRoots(input);
  const named = /^Reviewed repository: (.+)$/m.exec(report(input))?.[1].trim();
  let root;
  try {
    root = named && git(shellPath(named), 'rev-parse', '--show-toplevel');
  } catch {
    root = undefined;
  }

  // Only the named repository's start state is used up: concurrent reviewers of others need theirs.
  const startFile = root && candidates.includes(root) ? markerPath(root) + '-start' : undefined;
  const started = startFile && read(startFile)?.toString().trim();
  if (startFile) rmSync(startFile, { force: true });

  if (!started) {
    process.stderr.write(
      `cardan-review: the reviewer named ${named ?? 'no repository'}, which is not the session's ` +
        'repository, a Cardan repository next to it or a worktree of one of them, so the review was ' +
        'not recorded.\n',
    );
    return;
  }

  if (PLUGIN_REVIEWER.test(input.agent_type ?? '') && !setupOnly(root)) {
    process.stderr.write(
      'cardan-review: the uncommitted change is empty or touches more than plugins/, .claude-plugin/, ' +
        '.claude/, CLAUDE.md, REVIEW.md and other documentation, which the cardan:plugin-reviewer does not cover, so the review was not ' +
        'recorded; run the cardan:cardan-reviewer.\n',
    );
    return;
  }

  const tree = workingTree(root);
  if (started === tree) {
    writeFileSync(markerPath(root), tree + '\n');
  } else {
    process.stderr.write(
      'cardan-review: files changed while the review ran, so it was not recorded; review again.\n',
    );
  }
}

function guidelines() {
  const root = sessionRoot(readInput());
  if (!root || (!existsSync(join(root, 'REVIEW.md')) && !repositoryName(root))) return;

  const skill = readFileSync(join(PLUGIN_ROOT, 'skills', 'guidelines', 'SKILL.md'), 'utf8');
  const text = skill.replace(/^---\n[\s\S]*?\n---\n/, '').replaceAll('${CLAUDE_PLUGIN_ROOT}', PLUGIN_ROOT);
  process.stdout.write(text.trim() + '\n');
}

const command = process.argv[2];

try {
  if (command === 'gate') gate();
  else if (command === 'start') start();
  else if (command === 'mark') mark();
  else if (command === 'guidelines') guidelines();
  else {
    console.error('Usage: cardan-review.mjs gate | start | mark | guidelines');
    process.exit(1);
  }
} catch (error) {
  // The gate fails closed (onFailure: block); the others never block a session or subagent.
  process.stderr.write(`cardan-review ${command}: ${error.message}\n`);
  if (command === 'gate') process.exit(1);
}
