---
name: release
description: Release in a Cardan repository. In cardan-ui, a new version: version, changelog, migration notes, the plugin, review and pull request. In a project that releases from develop (cardan-academy-nuxt, cardan-auditor-nuxt), uncommitted work first through its own reviewed PR into develop, then the pull request from develop into main with the merged PRs as its description, and main back into develop after a merge.
disable-model-invocation: true
---

Look at the repository first: `git remote get-url origin`. In cardan-ui,
follow "Release Cardan UI". In a project with a `develop` branch, follow
"Release a project". A project without one releases by merging into `main`
and needs no skill.

## Release Cardan UI

Release the changes on the current branch of cardan-ui as a new version.
Work starts on `release/<version>`, so the branch names the version; ask
the user when it does not. A patch release (2.3.x) is the norm, a minor
one (2.x.0) for a breaking change.

1. **Version**: set `version` in `package.json`.
2. **Changelog**: add a `<ChangelogEntry v="<version>" date="<today>">`
   above the previous one in `.playground/pages/changelog.vue`, one `<li>`
   per change, in the voice of the entries there.
3. **Migration notes**: in `MIGRATION.md`, describe only what a project
   that extends the layer must do, or a change that can break it; the
   changelog lists every change, so the notes leave the rest out. That is: new tokens for `main.css`, renamed
   props or classes, behaviour that changes for stored content, modules or
   CSP hosts a project needs, and a plugin update (step 5) as a bullet with
   `claude plugin update cardan@cardan-ui --scope user`. A patch release is
   a `### <version>` subsection in the current minor's section: below the
   minor's own notes, which are everything before its first patch
   subsection, and above the previous patch. A minor release is a new
   section, `## Upgrading to <version>`, above the previous minor. So the
   newest release is at the top of the file, and within a minor the minor's
   own notes come first. A release
   that asks nothing of the projects gets only the line `<version> needs nothing from
projects. See changelog for details.`, without details: the changelog says what it
   changed. Then keep the five most recent releases that ask something, the
   one you are writing included, with the one-line sections between them,
   and remove everything older, so the file stays short for the projects
   and for the AI sessions that read it. A one-line release removes
   nothing. A release is a `### <version>` subsection, or a minor's own
   notes: everything in its section before its first `### <version>`
   subsection, with their topical `###` subsections. Remove from the oldest
   up, and a `## Upgrading to` section itself when nothing is left in it.
   The projects are kept up to date, and older notes stay in the history of
   the file (`git log -p MIGRATION.md`).
4. **CLAUDE.md**: update the component list or the sections that describe
   what changed, so it stays true.
5. **Plugin**: if anything under `plugins/cardan` changed, the other
   projects receive it with
   `claude plugin update cardan@cardan-ui --scope user`; say so in the PR
   description. The Playwright MCP server in `.mcp.json` is pinned, and the
   cross-browser script uses the same version; bump it there, and in
   `plugins/cardan-browsers/.mcp.json`, when a newer `@playwright/mcp` is
   wanted.
6. **Checks and review**: `pnpm run lint`, `pnpm run typecheck`,
   `pnpm test`, then the review as the Cardan guidelines describe.
7. **Pull request**: commit, push and open the PR against `main` with the
   `cardan:pr-body` skill. Merge only when the user says so. After the
   merge, the next work starts on `release/<next patch version>`, cut from
   `main`.

## Release a project

`main` is production, `develop` is staging. Every change reaches `develop`
through a reviewed pull request, so a release is one pull request from
`develop` into `main` with no code of its own, and it needs no review: the
review hook lets a PR from a branch with nothing uncommitted or unpushed
through, and a push that sends only commits already on `origin/main` or
`origin/develop`, each as a command of its own. Work that has not reached
`develop` yet goes there first, as part of the release (step 1).

1. **Stand on develop**: `git fetch origin`, then look at `git status`:
   - On `develop` with uncommitted changes: they are the last work of this
     release. `git switch -c <branch>`, named after what the changes do in
     the style of the repository's branches (`git branch -a`), and follow
     "Work for the release" below.
   - On another branch with uncommitted changes, or with commits on
     neither `origin/develop` nor `origin/main` (`git log
     origin/develop..HEAD --not origin/main` lists them): git cannot tell
     a branch cut from `develop` from a hotfix cut from `main`, so its pull
     request does (`gh pr view --json baseRefName,state`). An open PR into
     `develop`, or none when the user confirms the branch belongs to this
     release: follow "Work for the release". An open PR into `main` is a
     hotfix, not part of the release: ask the user whether to wait for it
     and bring `main` into `develop` (step 4) first. A merged PR, also a
     squash merge whose commits are on neither branch, is done: go on as
     in the next bullet. Ask too when the work looks unfinished, such as
     failing checks or a TODO in the diff.
   - Otherwise (a clean `develop`, `main` after a hotfix, a branch that is
     already merged): `git switch develop` and
     `git pull --ff-only origin develop`. A hotfix on `main` reaches
     `develop` through step 4, not as work of its own.
2. **Collect the release**: `git log --first-parent --format=%s
origin/main..origin/develop` lists one line per pull request merged into
   `develop` since the last release (a squash commit's subject, or a merge
   commit). Take each PR's title from `gh pr view <number> --json title`
   where the subject only names its number. Leave out a "Bring main into
   develop" merge (step 4). Nothing to release when the list is empty.
3. **Open the release PR**: first do the steps of its own that the
   project's CLAUDE.md lists for a release, such as a version bump or
   release notes elsewhere, each through its own pull request as that
   CLAUDE.md describes, then `gh pr create --base main --head develop`.
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
   check that `develop` already did it. Notes of older cardan-ui releases
   are removed from the file over time; find them with
   `git log -p MIGRATION.md` in cardan-ui.

### Work for the release

The work's own pull request into `develop`, and the release's own pull
requests, before step 2. The user is asked once, in step 5, apart from the
questions step 1 and the review round may raise.

1. **Bring the branch up to date** before the review, so the reviewer
   sees the tree that is pushed: `git stash --include-untracked`,
   `git rebase origin/develop`
   (a fast-forward for a branch without commits of its own), then
   `git stash pop`, and resolve a conflict before going on.
2. **Checks, review and browser check** as the Cardan guidelines describe
   ("Review Before Commit, Push and PR"), against `origin/develop`, with
   the fixes and the re-review they lead to. A finding outside the
   change, such as one in Cardan UI or a third-party component, is
   reported to the user, who decides whether and where it is fixed.
3. **Commit, push and open the PR** into `develop` with the
   `cardan:pr-body` skill, after the report of step 6 of those guidelines.
   When `develop` moves on during the review, leave the branch as it is: a
   rebase now changes the reviewed tree and needs another review round.
4. **The release's own pull requests**: the ones the project's CLAUDE.md
   lists for a release (see step 3 of "Release a project"), such as the
   version bump and the release notes. Write them from the PRs that
   step 2 lists plus this one, which is not merged yet. Each goes through
   its own review round, as in step 2: a version bump changes
   `package.json`, which the review hook does not count as documentation;
   release notes in Markdown alone need none.
5. **Merge into develop**: ask the user once whether to merge the PRs into
   `develop`, this one and the version bump (a staging deploy, not
   production), and merge them the way the repository's history does (a
   merge commit when `git log` shows "Merge pull request"). Release notes
   that are published when they merge wait for production, as the
   project's CLAUDE.md says. Then `git switch develop`,
   `git pull --ff-only origin develop`, and go on with step 2; step 3
   then opens only the release PR.
