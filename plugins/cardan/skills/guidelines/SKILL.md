---
name: guidelines
description: The shared frontend guidelines of the Cardan Nuxt projects (architecture, the review before every commit, CSS, code quality, WCAG 2.2). Claude Code adds them to every session in a Cardan repository; the cardan:cardan-reviewer agent loads them itself.
---

# Cardan frontend guidelines

These guidelines apply in every Cardan Nuxt repository. They come from the
`cardan` plugin (`plugins/cardan` in cardan-ui); edit them there only.

## Frontend architecture

- **Framework**: Nuxt.js with Vue Composition API
- **Language**: TypeScript strict mode
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Linting**: ESLint
- **Styling**: CSS with custom design system
- **Features**: i18n (EN/NL), dark mode, responsive design, MCP server
- **Focus**: Accessibility-first modern UI design for evergreen browsers

## Development Commands

```bash
pnpm dev            # Start development server
pnpm run lint       # Run ESLint
pnpm run typecheck  # Run vue-tsc, where the project has the script
pnpm test           # Run the tests, where the project has the script
pnpm run build      # Build the application for production
```

---

## Branches and releases

- **Without a `develop` branch** (cardan-ui, cardan-cms-nuxt): cut a branch from `main` and open the pull request against `main`. In cardan-ui a merge reaches every project at its next production build; `/cardan:release` makes it a version.
- **cardan-lms-nuxt and cardan-auditor-nuxt release from `develop`**: `main` is production, `develop` is staging, which Netlify builds on every merge. One branch per issue, cut from `develop`, with a pull request against `develop`. Merging into `develop` is not a production deploy, so an issue never waits for another one on its branch. A release is one pull request from `develop` into `main` without code of its own, merged with a merge commit; `/cardan:release` opens it with the merged PRs as its description. A hotfix is cut from `main` with a pull request against `main`; after its merge, `main` is brought into `develop` (`/cardan:release`, step 4), so staging matches production again.
- A push or PR from `main` or `develop` itself, with nothing uncommitted and nothing unpushed, carries only commits that reached the remote through reviewed pull requests. The review hook lets it through without a review; it still reviews everything else.

---

## Review Before Commit, Push and PR

### 🚨 MANDATORY: a fresh reviewer checks every change before it leaves the machine

Run a review **before every `git commit`, `git push` and `gh pr create`** in a Cardan repository. There is no review in GitHub Actions, so this local review is the only one. The one exception: a change that touches only documentation (Markdown files outside `plugins/` and `.claude/`) needs no review; the plugin's own prompts and skills are Markdown too, and those are reviewed like code.

The `cardan` plugin's hook enforces it: it blocks those commands until the `cardan:cardan-reviewer` agent has reviewed the files exactly as they are now. When that agent finishes, the hook records the state of the working tree; any change after that, a fix included, needs a new review. Never record that state yourself. Reviews are recorded only for the repository the session started in, so commit, push and open PRs in another repository from a session started there. Skip the review only when the user explicitly says to skip it for this change, by putting `SKIP_REVIEW=1` in front of the command; "commit this" or "push" is not a skip. The hook only sees the commands Claude runs: a push from the user's own terminal is not gated.

1. **Run the checks first**: `pnpm run lint`, plus `pnpm run typecheck` and `pnpm test` where the project has those scripts. REVIEW.md leaves out what ESLint enforces, so lint must pass on its own.
2. **Start the reviewer**: launch the `cardan:cardan-reviewer` agent with the Agent tool (`subagent_type: "cardan:cardan-reviewer"`). Never review your own changes in your own context, and never use a `fork` (it inherits your context).
3. **Brief it** with only the diff command and the target branch, never your own reasoning or what you think is fine:
   - Before a commit: every uncommitted change (`git diff HEAD`, plus untracked files). The hook records the whole working tree as reviewed, so review all of it, not only what is staged.
   - Before a push or PR: the whole branch against the branch it will merge into (`git diff origin/<base>`, which includes uncommitted changes). That is the branch the PR targets: `main`, or `develop` in cardan-auditor-nuxt and cardan-lms-nuxt ("Branches and releases" above). If every commit on the branch was already reviewed this way and nothing changed since, the commit review covers it and the hook lets the push through.
4. **Act on the findings**:
   - 🔴 Important: fix it. If after checking the code you think the finding is wrong, tell the user why instead of fixing it. After fixes, run the reviewer again on the changes since, saying in the brief that it is a re-review (Important findings only). Never commit or push with an open Important finding unless the user decides to.
   - 🟡 Nit: fix the clear ones before the re-review and list the rest for the user.
5. **Report**: before the re-review, and before you commit, push or open the PR, show the user the tally and every finding with what you did with it and why: fixed (and how), not fixed (and the reason), or left for the user to decide. The user can veto a decision only when they see the reasoning. Put a one-line summary of the local review in the PR description (the `cardan:pr-body` skill has the format).

The reviewer's report arrives a moment before the hook records it: when a commit right after the report is blocked as "not reviewed", wait a few seconds and try once more before anything else.

---

## Core Development Principles

### Custom CSS Design System

- Write custom CSS for the project, avoid using Tailwind classes
- Use CSS nested classes for styling, avoid adding classes to the root element
- Write mobile-first CSS, ensure the design is responsive and works on all devices
- Use logical properties and values
- Use CSS variables from Cardan UI for colors, spacing, typography, etc.
- Think through class placement, order, priority, and defaults - remove redundant classes, add classes to parent or child carefully to limit repetition, group elements logically
- Offer to extract repeated patterns into utility classes or Vue components, depending on the project's conventions

### Code Quality Standards
- Use TypeScript strict mode
- Follow Vue 3 Composition API patterns
- Implement comprehensive TypeScript types
- Write intuitive component APIs
- Implement proper error handling
- Use semantic naming conventions
- Organize code in logical file structures
- Prefer composition over inheritance

### Testing & Quality
- Use ESLint for code quality
- Test keyboard navigation
- Verify screen reader compatibility
- Check a change in the browser while you work on it: the plugin's Playwright MCP server loads the dev server, walks a page with the keyboard, reads the console and screenshots at 320px. The reviewer does not do this; the working session does

### Performance
- Implement tree-shaking for components
- Use lazy loading where appropriate
- Optimize bundle size
- Monitor performance metrics

### Dependencies
- **Preference**: Avoid adding new external dependencies unless absolutely necessary
- **Reuse**: A dependency that Cardan UI already lists is not a new dependency. Reusing it in a project is fine, especially a Nuxt module: prefer it over writing your own version
- **Version Control**: Keep dependencies up to date and secure

### Project Planning

When working on new features or components:
1. **Outline a plan** before making code changes
2. Consider accessibility requirements from the start
3. Follow established patterns and conventions
4. Test thoroughly before implementation
5. Document any new patterns or utilities

---

## Web Content Accessibility Guidelines

### 🚨 ACCESSIBILITY FIRST - MANDATORY REQUIREMENT

**CRITICAL**: Since we are an accessibility first company, every frontend change MUST comply with all 55 WCAG 2.2 level A and AA success criteria. This is non-negotiable.

### Accessibility Requirements for ALL Changes:

- **WCAG 2.2 Compliance**: Must meet all Level A and AA success criteria
- **Semantic HTML**: Use proper HTML elements and structure
- **Keyboard Navigation**: Ensure full keyboard accessibility
- **Screen Reader Support**: Provide proper labels, roles, and descriptions
- **Color Contrast**: Meet minimum contrast ratios (4.5:1 for normal text, 3:1 for large text and graphical UI elements)
- **Focus Management**: Visible focus indicators and logical focus order
- **Alternative Text**: Empty alt text for decorative images and descriptive alt text for all other images
- **Form Labels**: Proper labeling and error handling for forms
- **Responsive Design**: Accessible across all device sizes and orientations, support viewport width from 320px and up

### Testing Accessibility Changes:

- Test with keyboard navigation only
- Verify with screen readers (built-in or extensions)
- Check color contrast ratios
- Validate HTML semantics
- Run the automated accessibility tests where the project has them (`pnpm test`, with vitest-axe)
