---
name: release
description: Release in a Cardan repository. In cardan-ui, a new version: version, changelog, migration notes, the plugin, review and pull request. In a project that releases from develop (cardan-lms-nuxt, cardan-auditor-nuxt), the pull request from develop into main with the merged PRs as its description, and main back into develop after a merge.
disable-model-invocation: true
---

Look at the repository first: `git remote get-url origin`. In cardan-ui,
follow "Release Cardan UI". In a project with a `develop` branch, follow
"Release a project". A project without one releases by merging into `main`
and needs no skill.

## Release Cardan UI

Release the changes on the current branch of cardan-ui as a new version.
Ask the user for the version when the branch does not say it; a patch
release (2.3.x) is the norm, a minor one (2.x.0) for a breaking change.

1. **Version**: set `version` in `package.json`.
2. **Changelog**: add a `<ChangelogEntry v="<version>" date="<today>">`
   above the previous one in `.playground/pages/changelog.vue`, one `<li>`
   per change, in the voice of the entries there.
3. **Migration notes**: in `MIGRATION.md`, describe what a project that
   extends the layer must do or check: new tokens for `main.css`, renamed
   props or classes, behaviour that changes for stored content, modules or
   CSP hosts a project needs. A patch release is a `### <version>`
   subsection at the end of the current minor's section; a minor release
   is a new `## <n>. Upgrading to <version>` section.
4. **CLAUDE.md**: update the component list or the sections that describe
   what changed, so it stays true.
5. **Plugin**: if anything under `plugins/cardan` changed, the other
   projects receive it with `claude plugin update cardan@cardan-ui`; say so
   in the PR description. The Playwright MCP server in `.mcp.json` is
   pinned; bump it there when a newer `@playwright/mcp` is wanted.
6. **Checks and review**: `pnpm run lint`, `pnpm run typecheck`,
   `pnpm test`, then the review as the Cardan guidelines describe.
7. **Pull request**: commit, push and open the PR against `main` with the
   `cardan:pr-body` skill. Merge only when the user says so.

## Release a project

`main` is production, `develop` is staging. Every change reached `develop`
through a reviewed pull request, so a release is one pull request from
`develop` into `main` with no code of its own, and it needs no review: the
review hook lets a PR from a branch with nothing uncommitted or unpushed
through, and a push that sends only commits already on `origin/main` or
`origin/develop`, each as a command of its own. Start from a clean working
tree.

1. **Stand on develop**: `git fetch origin`, then `git checkout develop`
   and `git pull --ff-only origin develop`. Stop when `git status` shows
   uncommitted changes.
2. **Collect the release**: `git log --first-parent --format=%s
   origin/main..origin/develop` lists one line per pull request merged into
   `develop` since the last release (a squash commit's subject, or a merge
   commit). Take each PR's title from `gh pr view <number> --json title`
   where the subject only names its number. Leave out a "Bring main into
   develop" merge (step 4). Nothing to release when the list is empty.
3. **Open the release PR**: `gh pr create --base main --head develop`.
   The title is `Release <version>` when `package.json` has a `version`
   that the user wants to raise (set it on `develop` first, through its own
   PR), otherwise `Release <today>`. The description is a list with one
   bullet per merged PR, as `#<number> <title>`, in the order they were
   merged, then a line that says what to check on production, and the
   attribution line the session was given. Merge only when the user says
   so, with a merge commit, never a squash: a squash makes `main` and
   `develop` diverge and the next release shows the old commits again.
4. **Bring main back into develop** after the merge, and after every
   hotfix merged into `main`, so staging matches production:
   `git fetch origin && git push origin origin/main:develop`. Right after a
   release that is a fast-forward and done. When git rejects it because
   `develop` has moved on, open a pull request instead: `gh pr create
   --base develop --head main --title "Bring main into develop"`, and
   merge it with a merge commit.
5. **Cardan UI**: the production build takes the latest `main` of
   cardan-ui. When cardan-ui's `MIGRATION.md` gained a section since the
   last release, say in the release PR what it asks of this project, and
   check that `develop` already did it.
