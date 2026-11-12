---
name: guidelines
description: The shared frontend guidelines of the Cardan Nuxt projects (the review before every commit, CSS, dependencies, browser checks, WCAG 2.2). Claude Code adds them to every session in a Cardan repository.
---

# Cardan frontend guidelines

These guidelines apply in every Cardan Nuxt repository. They come from the
`cardan` plugin (`plugins/cardan` in cardan-ui); edit them there only.

## Branches and releases

- Each repository's CLAUDE.md says which branch work starts from and which branch a pull request targets; `/cardan:release` makes a release. A release, and `main` brought back into `develop`, needs no review: see the exceptions under "Review Before Commit, Push and PR".
- **Netlify skips a build** when a push changes only documentation, AI or CI setup: the `ignore` command in each project's `netlify.toml` lists those paths (`CLAUDE.md`, `REVIEW.md`, `AGENTS.md`, `README.md`, `MIGRATION.md`, `docs/`, `.claude/`, `.cursor/`, `.mcp.json`, `.github/`, and in cardan-ui `plugins/` and `.claude-plugin/`, but not its `README.md`, which the playground shows). A merge of only those does not deploy, and does not pick up a newer Cardan UI either. A new file or folder of that kind goes on the list in every project.

---

## Review Before Commit, Push and PR

### 🚨 MANDATORY: a fresh reviewer checks every change before it leaves the machine

Run a review **before every `git commit`, `git push` and `gh pr create`** in a Cardan repository. There is no review in GitHub Actions, so this local review is the only one. Three cases need no review, each run as a command of its own (not chained with another commit, push or PR):

- A change that touches only documentation (Markdown files outside `plugins/` and `.claude/`). The plugin's own prompts and skills, CLAUDE.md and REVIEW.md are Markdown too, but they instruct Claude, so they are reviewed like code.
- A PR from a branch with nothing uncommitted and nothing unpushed: its commits are already on the remote, through the push gate or a push the user made outside it.
- A push that sends only commits already on `origin/main` or `origin/develop`, which arrived through reviewed pull requests. This covers bringing `main` back into `develop`; the release PR is the case above.

The `cardan` plugin's hook enforces it: it blocks those commands until the `cardan:cardan-reviewer` agent, or the `cardan:plugin-reviewer` for a change to the Claude Code setup alone, has reviewed the files exactly as they are now. When that agent finishes, the hook records the state of the working tree; any change after that, a fix included, needs a new review. Never record that state yourself. A review counts for the repository the reviewer names on its last line (`Reviewed repository: <path>`): the session's own, or a Cardan repository (one with a REVIEW.md) in the same parent folder, so one session can work across the checkouts that sit side by side. Skip the review only when the user explicitly says to skip it for this change, by putting `SKIP_REVIEW=1` in front of the command; "commit this" or "push" is not a skip. The hook only sees the commands Claude runs: a push from the user's own terminal is not gated. Every commit is a review round, so commit a finished piece of work, not each step of it.

1. **Run the checks first**: `pnpm run lint`, plus `pnpm run typecheck` and `pnpm test` where the project has those scripts. REVIEW.md leaves out what ESLint enforces, so lint must pass on its own.
2. **Start the reviewer**: launch the `cardan:cardan-reviewer` agent with the Agent tool (`subagent_type: "cardan:cardan-reviewer"`). When every uncommitted change is to the Claude Code setup (`plugins/`, `.claude-plugin/`, `.claude/`, a CLAUDE.md or REVIEW.md) or documentation, launch `cardan:plugin-reviewer` instead: it checks the hook, the instructions and their references rather than components, and skips the browser check. Never review your own changes in your own context, and never use a `fork` (it inherits your context).
3. **Brief it** (except in the three cases above) with only the repository's absolute path, the diff command and the target branch, never your own reasoning or what you think is fine:
   - Before a commit: every uncommitted change (`git diff HEAD`, plus untracked files). The hook records the whole working tree as reviewed, so review all of it, not only what is staged.
   - Before a push or PR: the whole branch against the branch it will merge into (`git diff origin/<base>`, which includes uncommitted changes), the one the repository's CLAUDE.md names. If every commit on the branch was already reviewed this way and nothing changed since, the commit review covers it and the hook lets the push through.
4. **Test in Chrome, Firefox and WebKit** while the reviewer runs, when the change alters what a page shows or how it behaves (a component, page, style or composable; not documentation, tests, configuration or the plugin). The reviewer reads code only: this is the review round's browser check, and the only time a change runs in all three browsers. On the project's dev server (`pnpm dev` when it is not running), run for each page that shows the changed code:

   `node "${CLAUDE_PLUGIN_ROOT}/scripts/cross-browser.mjs" <url> [--focus <css>] [--steps Tab,Enter,click:<css>,hover:<css>,…] [--snapshot <css>] [--login <email>:<password>] [--browsers firefox,…]`

   It opens the page in the three browsers at once, runs the steps (ten Tabs by default; `--focus` starts at the changed element) and prints one table: console errors, horizontal scroll at 320px and 1280px, and after each step where focus is and what is open, with the side of its trigger a popover sits on. `--snapshot` adds the accessibility tree of the changed element. A row marked ≠ differs between browsers, and is a finding handled like the reviewer's in the next step: 🔴 Important when the change does not work in a browser (a control that cannot be reached or used, focus lost or trapped, a console error, content cut off), 🟡 Nit when it works but looks or sits differently. A page behind sign-in takes `--login` with the project's local development account (ask the user for it once; never a real one): it signs in once and shares the session with the three browsers. `--browsers` reruns only the browser that failed. Focus that differs after a click in WebKit is Safari's own behaviour, which the script explains when it happens. Read a screenshot it saved only to see a layout difference. After a fix, run it again. When it says a browser is not installed, run the install command it prints once.

   When a difference needs a closer look than the table and screenshots give, ask the user to switch on the `cardan-browsers` plugin with `/plugin` (installing it there first from the `cardan-ui` marketplace when it is not listed): it adds the `playwright-firefox` and `playwright-webkit` MCP servers. Ask them to switch it off again afterwards, so it costs nothing in other sessions.
5. **Act on the findings**:
   - 🔴 Important: fix it. If after checking the code you think the finding is wrong, tell the user why instead of fixing it. After fixes, run the reviewer again on the changes since, saying in the brief that it is a re-review (Important findings only). Never commit or push with an open Important finding unless the user decides to.
   - 🟡 Nit: fix the clear ones before the re-review and list the rest for the user.
6. **Report**: before the re-review, and before you commit, push or open the PR, show the user the tally, the browser check (the browsers it ran in, or why it was skipped) and every finding with what you did with it and why: fixed (and how), not fixed (and the reason), or left for the user to decide. The user can veto a decision only when they see the reasoning. Put a one-line summary of the local review in the PR description (the `cardan:pr-body` skill has the format).

The reviewer's report arrives a moment before the hook records it: when a commit right after the report is blocked as "not reviewed", wait a few seconds and try once more before anything else.

---

## CSS

- Nested classes, not classes on the root element; mobile-first; logical properties and values.
- The CSS variables of Cardan UI for colors, spacing, typography and the rest.
- Think through class placement, order, priority and defaults: remove redundant classes, put a class on the parent or the child so it repeats least, group elements logically. Offer to extract a repeated pattern into a utility class or a Vue component, depending on the project's conventions.

## Dependencies

Avoid a new external dependency unless it is necessary. A dependency that Cardan UI already lists is not a new one: reusing it in a project is fine, especially a Nuxt module, and better than writing your own version.

## Browser checks while you work

- Check a change in the browser while you work on it: the plugin's `playwright` MCP server (Chrome) loads the dev server, walks a page with the keyboard, reads the console and screenshots at 320px. Firefox and WebKit join in the review round (step 4 above).
- A browser check reads what it needs, not the whole page: `browser_snapshot` with `target` or `depth` for the element under test, `browser_evaluate` for a value, a screenshot only for layout. A snapshot or screenshot of the whole page at every step is what makes these checks expensive.

---

## 🚨 Accessibility first: WCAG 2.2 A and AA

Cardan is an accessibility-first company: every frontend change must meet all 55 WCAG 2.2 level A and AA success criteria. In particular:

- Semantic HTML, full keyboard access, visible focus and a logical focus order.
- Labels, roles and descriptions for screen readers, and labelled forms with announced errors.
- Contrast of 4.5:1 for normal text and 3:1 for large text and graphical UI elements.
- Empty alt text for decorative images, descriptive alt text for the rest.
- Reflow from 320px wide, in every orientation.

Test with the keyboard alone and with a screen reader, and run the automated accessibility tests where the project has them (`pnpm test`, with vitest-axe).
