---
name: release
description: Release a new version of Cardan UI: version, changelog, migration notes, the plugin, review and pull request. For the cardan-ui repository only.
disable-model-invocation: true
---

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
