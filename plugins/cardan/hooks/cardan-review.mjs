#!/usr/bin/env node
/**
 * The local review of the Cardan Nuxt projects, described in the guidelines
 * skill of this plugin (skills/guidelines/SKILL.md).
 *
 *   gate        PreToolUse on Bash: blocks `git commit`, `git push` and
 *               `gh pr create` until the cardan:cardan-reviewer agent has
 *               reviewed the files exactly as they are now, or the
 *               cardan:plugin-reviewer agent has, for a change to the
 *               Claude Code setup alone (see `setupOnly`), CLAUDE.md and
 *               REVIEW.md included. A change that touches only
 *               documentation (other Markdown outside `plugins/` and
 *               `.claude/`) passes without a review, and so do a PR
 *               from a branch with nothing uncommitted or unpushed and a
 *               push that sends only commits already on `origin/main` or
 *               `origin/develop` (main brought back into develop).
 *               These pass each as the only gated command in its line.
 *               A review counts for the repository the reviewer named,
 *               whichever repository the session started in.
 *   start       SubagentStart of the reviewer: notes the state of every
 *               repository it may review (see `candidateRoots`).
 *   mark        SubagentStop of the reviewer: records the state of the
 *               repository it names as reviewed, unless a file in it
 *               changed while the review ran.
 *   guidelines  SessionStart: prints the guidelines, which Claude Code adds
 *               to the session's context.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEWER = /^(cardan:)?(cardan|plugin)-reviewer$/;
const PLUGIN_REVIEWER = /^(cardan:)?plugin-reviewer$/;

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
 * the `cd`s before it: `cd cardan-academy-nuxt && git commit` commits in
 * cardan-academy-nuxt, not in the directory the session started in.
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

/**
 * The remote branch nearest to HEAD: the upstream, or the one of
 * origin/develop, origin/main and origin/HEAD with the fewest commits behind
 * HEAD. Undefined without a remote.
 */
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

/**
 * CLAUDE.md and REVIEW.md, at any depth: instructions that Claude sessions
 * and the reviewer read, so they are reviewed like the plugin, not passed as
 * documentation.
 */
function isInstructions(file) {
  return /(^|\/)(CLAUDE|REVIEW)\.md$/.test(file);
}

/**
 * A Markdown file that is documentation, not behaviour: the plugin's agent
 * prompt and skills under `plugins/`, anything under `.claude/`, CLAUDE.md
 * and REVIEW.md are Markdown too, and those are reviewed like code.
 */
function isDocumentation(file) {
  return /\.md$/i.test(file) && !/^(plugins|\.claude)\//.test(file) && !isInstructions(file);
}

/**
 * Whether the change touches only documentation: the working tree against
 * HEAD, the untracked files, and the commits not yet on the nearest remote
 * branch. Such a change needs no review. Anything unclear counts as code.
 */
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

/** A file of the Claude Code setup: the cardan plugin, `.claude/`, CLAUDE.md or REVIEW.md. */
function isSetup(file) {
  return /^(plugins|\.claude-plugin|\.claude)\//.test(file) || isInstructions(file);
}

/**
 * Whether every uncommitted change (the working tree against HEAD and the
 * untracked files) is to the Claude Code setup or documentation: the change
 * the cardan:plugin-reviewer may review instead of the cardan:cardan-reviewer.
 * Anything unclear counts as code.
 */
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

/**
 * The branch HEAD is on, when nothing is uncommitted and nothing unpushed:
 * HEAD equals `origin/<branch>` and the working tree equals HEAD.
 * Undefined otherwise.
 */
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

/** Options of `git push` that do not change what it sends. */
const PUSH_OPTIONS = /^(-u|--set-upstream|-q|--quiet|-v|--verbose)$/;

/**
 * The commits a `git push` to origin sends, from the arguments after
 * `push`: the sources of its refspecs, or HEAD without one. Undefined when
 * that is not clear: another remote, a deletion, an option such as `--all`,
 * `--tags` or `--force`, or a quote.
 */
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

/**
 * Whether a commit is on `origin/main` or `origin/develop`, where commits
 * arrive only through reviewed pull requests.
 */
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

/**
 * Whether the command ships nothing new: a PR from a branch that is pushed
 * and clean, whose commits passed the push gate or were pushed outside it by
 * the user's choice (the release PR from develop is one); or a push that
 * sends only commits already on `origin/main` or `origin/develop` (main
 * brought back into develop). `rest` is the command line after the matched
 * command, up to the next separator.
 */
function nothingNew(root, matched, rest) {
  if (/\bgh\s+pr\s+create\b/.test(matched)) return pushedBranch(root) !== undefined;
  if (!/\bpush$/.test(matched)) return false;

  const sources = pushSources(rest);
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

  // What needs no review passes, but only for a single gated command: in a
  // chain, a later commit or push could run in another state or another
  // repository than the one checked.
  const single = command.match(new RegExp(REVIEW_COMMAND.source, 'gm')).length === 1;
  const rest = command.slice(match.index + match[0].length).split(/[;&|)\n]/)[0];
  if (single && (markdownOnly(root) || nothingNew(root, match[0], rest))) return;

  // The marker lives in this repository's own .git and holds the state the
  // reviewer reviewed there, so a review of one repository never counts for
  // another, whichever repository the session started in.
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

/** The repository the session started in, or undefined outside one. */
function sessionRoot(input) {
  try {
    return git(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd(), 'rev-parse', '--show-toplevel');
  } catch {
    return undefined;
  }
}

/**
 * The repositories a review may be of: the session's, and the Cardan
 * repositories (those with a REVIEW.md) next to it, the way the checkouts
 * sit side by side. SubagentStart does not say which one the reviewer was
 * asked to review, so `start` notes the state of each, and `mark` records
 * the one the reviewer names.
 */
function candidateRoots(input) {
  const session = sessionRoot(input);
  const roots = new Set(session ? [session] : []);
  const parent = dirname(session ?? resolve(input.cwd ?? process.cwd()));

  let entries = [];
  try {
    entries = readdirSync(parent, { withFileTypes: true });
  } catch {
    // An unreadable parent leaves the session's repository alone.
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
  return [...roots];
}

/** SubagentStart of the reviewer: the state each candidate starts from. */
function start() {
  const input = readInput();
  if (!REVIEWER.test(input.agent_type ?? '')) return;

  for (const root of candidateRoots(input)) {
    try {
      writeFileSync(markerPath(root) + '-start', workingTree(root) + '\n');
    } catch {
      // A repository that cannot be read cannot be recorded as reviewed.
    }
  }
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
 * SubagentStop of the reviewer: records the state of the repository the
 * reviewer names on its last line as reviewed, but only when `start` noted
 * that repository's state and no file in it changed while the review ran.
 */
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

  // Only the named repository's start state is used up: reviewers of other
  // repositories may be running at the same time and still need theirs.
  // The other states stay until the next reviewer's start replaces them.
  const startFile = root && candidates.includes(root) ? markerPath(root) + '-start' : undefined;
  const started = startFile && read(startFile)?.toString().trim();
  if (startFile) rmSync(startFile, { force: true });

  if (!started) {
    process.stderr.write(
      `cardan-review: the reviewer named ${named ?? 'no repository'}, which is not the session's ` +
        'repository or a Cardan repository next to it, so the review was not recorded.\n',
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

/**
 * SessionStart: the guidelines for Claude's context, in a Cardan project
 * (one with a REVIEW.md or a cardan-a11y remote). The guidelines skill's
 * text, without its frontmatter.
 */
function guidelines() {
  const root = sessionRoot(readInput());
  if (!root || (!existsSync(join(root, 'REVIEW.md')) && !repositoryName(root))) return;

  // `${CLAUDE_PLUGIN_ROOT}` in the guidelines becomes the plugin's folder,
  // so a session can run the plugin's scripts wherever it is installed.
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
  // The gate fails closed (its hook has onFailure: block); the others must
  // never block a session or a subagent.
  process.stderr.write(`cardan-review ${command}: ${error.message}\n`);
  if (command === 'gate') process.exit(1);
}
