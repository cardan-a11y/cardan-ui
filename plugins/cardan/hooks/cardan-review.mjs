#!/usr/bin/env node
/**
 * The local review of the Cardan Nuxt projects, described in the guidelines
 * skill of this plugin (skills/guidelines/SKILL.md).
 *
 *   gate        PreToolUse on Bash: blocks `git commit`, `git push` and
 *               `gh pr create` until the cardan:cardan-reviewer agent has
 *               reviewed the files exactly as they are now. A change that
 *               touches only documentation (Markdown outside `plugins/`
 *               and `.claude/`) passes without a review, and so do a PR
 *               from a branch with nothing uncommitted or unpushed and a
 *               push that sends only commits already on `origin/main` or
 *               `origin/develop` (main brought back into develop).
 *               These pass in any repository, each as the only gated
 *               command in its line; anything else must be reviewed in a
 *               session started in the repository.
 *   start       SubagentStart of the reviewer: notes the state it reviews.
 *   mark        SubagentStop of the reviewer: records that state as
 *               reviewed, unless a file changed while the review ran.
 *   guidelines  SessionStart: prints the guidelines, which Claude Code adds
 *               to the session's context.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REVIEWER = /^(cardan:)?cardan-reviewer$/;

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
 * A Markdown file that is documentation, not behaviour: the plugin's agent
 * prompt and skills under `plugins/` and anything under `.claude/` are
 * Markdown too, and those are reviewed like code.
 */
function isDocumentation(file) {
  return /\.md$/i.test(file) && !/^(plugins|\.claude)\//.test(file);
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

  // What needs no review passes in any repository, also one the session
  // did not start in: the session check only matters for a recorded review.
  // Only for a single gated command: in a chain, a later commit or push
  // could run in another state or another repository than the one checked.
  const single = command.match(new RegExp(REVIEW_COMMAND.source, 'gm')).length === 1;
  const rest = command.slice(match.index + match[0].length).split(/[;&|)\n]/)[0];
  if (single && (markdownOnly(root) || nothingNew(root, match[0], rest))) return;

  const session = sessionRoot(input);
  if (root !== session) {
    block(
      `Blocked: this Claude session started in ${session ?? 'a folder outside a repository'} ` +
        `and records reviews only for that repository. Commit, push or open the PR in ${root} ` +
        'from a Claude session started there. Only when the user explicitly said to skip the ' +
        'review for this change, put SKIP_REVIEW=1 in front of the command.',
    );
  }

  const marker = read(markerPath(root))?.toString().trim();
  if (marker !== workingTree(root)) {
    block(
      'Blocked: the files as they are now have not been reviewed. Run the ' +
        'cardan:cardan-reviewer agent as described in the Cardan guidelines ("Review Before ' +
        'Commit, Push and PR"); it records the reviewed state when it finishes, and any change ' +
        'after that needs a new review. Only a change to documentation alone (Markdown outside ' +
        'plugins/ and .claude/), a PR from a branch with nothing uncommitted or unpushed, and a ' +
        'push that sends only commits already on origin/main or origin/develop need none, each ' +
        'as a command of its own. ' +
        'Only when the user explicitly said to skip the review for this change, put ' +
        'SKIP_REVIEW=1 in front of the command.',
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

/** SubagentStart of the reviewer: the state the review starts from. */
function start() {
  const input = readInput();
  if (!REVIEWER.test(input.agent_type ?? '')) return;

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
 * SubagentStop of the reviewer: records the state as reviewed, but only
 * when the reviewer names the session's repository on its last line and no
 * file changed while the review ran.
 */
function mark() {
  const input = readInput();
  if (!REVIEWER.test(input.agent_type ?? '')) return;

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

/**
 * SessionStart: the guidelines for Claude's context, in a Cardan project
 * (one with a REVIEW.md or a cardan-a11y remote). The guidelines skill's
 * text, without its frontmatter.
 */
function guidelines() {
  const root = sessionRoot(readInput());
  if (!root || (!existsSync(join(root, 'REVIEW.md')) && !repositoryName(root))) return;

  const skill = readFileSync(join(PLUGIN_ROOT, 'skills', 'guidelines', 'SKILL.md'), 'utf8');
  process.stdout.write(skill.replace(/^---\n[\s\S]*?\n---\n/, '').trim() + '\n');
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
