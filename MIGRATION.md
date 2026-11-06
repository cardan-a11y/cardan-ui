# Upgrading Cardan UI

This guide is for developers of projects that extend the layer. Each section says what a project must do or check for a release: new tokens for its `main.css`, renamed props or classes, modules or CSP hosts. The components read their design tokens from the project's own `main.css`, a copy of the template in [`app/assets/main.css`](app/assets/main.css), so a token a release adds has to be pasted there.

The projects are kept up to date, so the file only holds the five most recent releases: each release removes the notes older than that. Older notes are in the history of this file (`git log -p MIGRATION.md`).

## Upgrading to 2.3

### 2.3.2

2.3.2 is a security update: Nuxt 4.6.4, and the latest versions of the other dependencies except TypeScript.

- **Update Nuxt to 4.6.4** in every project, first of all in the ones that render on the server (Cardan LMS's public pages, Cardan Support, the websites): `pnpm update --latest '!typescript'`, then `pnpm run build`. Keep TypeScript on 6.
- **A project on `compatibilityVersion: 5`** (cardan-lms-nuxt, cardan-auditor-nuxt) sets `experimental: { nitroAutoImports: true }` in its `nuxt.config.ts`. With version 5, Nuxt 4.6 turns off the auto-imports of the server bundle, which the server runtime of `@nuxtjs/i18n` and `@nuxt/image` still relies on; without them the build fails with `"useRuntimeConfig" is not exported by "#imports"`.
- **The cardan plugin**: run `claude plugin update cardan@cardan-ui`. In cardan-lms-nuxt and cardan-auditor-nuxt, work goes into `develop` and reaches `main` through one release pull request (`/cardan:release`), from the releases of 3 November 2026 on.

### 2.3.3

2.3.3 needs nothing from projects.

- **A CardanLogo lockup grows from the narrow width at every screen width**, no longer only from 320px. Below 320px, which the projects do not support, it is no longer fixed at the narrow width.

### 2.3.4

2.3.4 brings **Accordion** closer to the APG accordion pattern. It looks the same in a project that does nothing, but its panel is no longer a landmark.

- **New `h-tag` prop** wraps the trigger button in a heading (`h-tag="h3"`), at the level the section's title has in the page, as the pattern asks. Set it on every Accordion whose trigger is a title. A heading inside the `trigger` slot moves out: `<Accordion h-tag="h3"><template #trigger>Transcript</template>` instead of an `<h3>` in the slot, since a button may not contain a heading.
- **The panel is a plain `div`** and a `region` landmark only with the new **`region` prop**, with `aria-labelledby` to its trigger. Until now every panel was a `<section aria-labelledby>`, a landmark, and the pattern warns against a page full of them. Add `region` to a panel with headings or nested accordions of its own.
- **The trigger is in a wrapper** (`.accordion-header`, the heading or a `div`), so it is no longer a sibling of the panel. A selector such as `.accordion-trigger[aria-expanded='true'] ~ .accordion-panel-wrapper` in a project matches nothing now; the wrapper carries `.accordion-wrapper--open` instead.
- **The panel's overflow follows its state** also without a transition (reduced motion): a closing panel no longer paints over what follows, an opening one no longer clips focus outlines. Remove a workaround that set `overflow` on `.accordion-panel` from `aria-expanded`.
- **MobileMenu** pads the start of its content with `--app-padding-inline`, the project's own inline padding, as its navigation already did, instead of a fixed 1.25rem. In cardan-auditor-nuxt that is 0.75rem below 480px, in cardan-lms-nuxt below 768px. The token is now in the `main.css` template (0.75rem, 1.5rem from 480px). A project without it has no padding there and adds it to its `main.css`. cardan-support names its padding `--padding-inline`, so it pastes:

  ```css
  :where(:root) {
    --app-padding-inline: var(--padding-inline);
  }
  ```

- **The outline Button** has a `--color-grey-light` border (was `--color-grey-bg`), which stands out from the background. Check a place where your own CSS changed that border.
- **`formatFileSize(bytes, locale?)`** counts in decimal units and formats in the app's locale unless you give another ("2,4 MB" in Dutch). A call with one argument keeps working.
- **`toolbars` and `footers`**, MarkdownEditor's toolbar settings, are no longer auto-imported from `app/utils/markdown.ts`; they moved into the component. No project used them.
- **The cardan plugin**: run `claude plugin update cardan@cardan-ui --scope user`. A review now counts for the repository the reviewer names, also from a session started in another repository, and the Playwright MCP server gives each session its own browser profile, so sessions no longer block each other. The guidelines now say that every project's `netlify.toml` skips builds of documentation, AI and CI changes (cardan-ui#32 and the matching PRs in each project; check that yours has the `ignore` command), and that `develop` is the default branch on GitHub of cardan-lms-nuxt and cardan-auditor-nuxt, so a hotfix PR passes `--base main`.

### 2.3.5

2.3.5 makes **MarkdownPreview** lighter: highlight.js loads only when a text has a code block, with six grammars instead of 38. In Cardan Academy that takes about 150 KB raw (50 KB gzipped) out of the chunk every course page executes, and keeps highlight.js out of pages without code.

- **A code block is coloured after the text is in the page**: it is a dark block with plain text first and its tokens get their colours a moment later, also in a server-rendered page. The HTML of a block is unchanged except for a `data-lang` attribute on the `<code>` element (`<pre><code class="hljs" data-lang="css">`), and the theme still ships with the component, so styles on `.hljs` keep working. A test that reads a block's spans right after mount waits for them (`vi.waitFor`).
- **Six grammars**: `xml` (also `html` and `svg`), `css`, `javascript`, `typescript`, `json` and `bash`, with the aliases highlight.js gives them (`js`, `ts`, `sh`, …). A fence in another language stays plain, where `highlight.js/lib/common` coloured 38 languages. Check your stored markdown for fences in another language (PHP, Python, SQL, YAML, …); when Cardan content needs one, add it to `app/components/Markdown/highlight.ts` in cardan-ui, so every project gets it. The playground's markdown page lists the set.
- **`vite.optimizeDeps.include`** in a project's `nuxt.config.ts`: replace `highlight.js/lib/common` with the six `highlight.js/lib/languages/*` entries, as the playground does (`.playground/nuxt.config.ts`); cardan-lms-nuxt has them.
- **The header cells of a markdown table** carry `scope="col"`, which WCAG H63 asks for. Nothing to do, unless your CSS selects `th[scope]`.
- **The cardan plugin**: run `claude plugin update cardan@cardan-ui --scope user`. The release skill now keeps the five most recent releases in this file.

### 2.3.6

2.3.6 needs nothing from projects. It fixes a page that could no longer be used after a link in **MobileMenu**.

- **FocusLoop lifts the `inert` it put on the rest of the page when it is unmounted while still open.** A link in MobileMenu (or a Dialog or UserMenu) that leads to a page in another layout unmounts the menu with the old layout before it has closed, and until now everything outside the menu stayed `inert`: nothing on the new page could be clicked or focused until a reload.
