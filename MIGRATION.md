# Upgrading Cardan UI

This guide is for developers of projects that extend the layer. Each section says what a project must do or check for a release: new tokens for its `main.css`, renamed props or classes, modules or CSP hosts. The components read their design tokens from the project's own `main.css`, a copy of the template in [`app/assets/main.css`](app/assets/main.css), so a token a release adds has to be pasted there.

The projects are kept up to date, so the file only holds the most recent releases: each release removes the notes of the oldest one. Older notes are in the history of this file (`git log -p MIGRATION.md`).

## Upgrading to 2.3

### 2.3.1

2.3.1 lets a markdown text show a video: a bare YouTube or Vimeo link in a paragraph of its own renders as a **VideoPlayer**, so authors paste the link where the video belongs, in any markdown editor.

- **A bare YouTube or Vimeo link in a paragraph of its own renders as a VideoPlayer** in MarkdownPreview: the thumbnail, the play button and the video's title, and the player after a click. Also without `trusted`: the link only ever becomes a video id, so a text cannot embed anything else. A link with its own text (`[Watch the recording](https://…)`), a link inside a sentence, a list or a quote, and a link in an `inline` or clamped (`ellipsis-lines`) text stay links. In a `trusted` text, keep a video link out of raw HTML blocks: a player between a `<div>` and its `</div>` ends up outside them. Check your stored markdown for a video link alone in a paragraph that should stay a link, and give it a text.
- **The text around a video is in chunks** (`.markdown-chunk`), with the players between them. CSS on `.cardan-markdown-preview > p` or another direct child does not reach a text with videos; select `.cardan-markdown-preview p` instead.
- **VideoPlayer needs `@nuxt/image`** for the thumbnail. A project that shows markdown from others and does not have it yet (cardan-auditor-nuxt) adds it to its modules (`pnpm add -D @nuxt/image`), and allows the thumbnail hosts in production, like the playground does: `image: { domains: ['i.ytimg.com', 'i.vimeocdn.com'] }`.
- **A strict Content Security Policy** on a page that shows markdown needs the player's hosts, as a page with a VideoPlayer does: `connect-src` for `youtube.com` and `vimeo.com` (the video's title), `img-src` for `i.ytimg.com` and `i.vimeocdn.com` (the thumbnail) and `frame-src` for `www.youtube-nocookie.com` and `player.vimeo.com` (the player).
- **VideoPlayer's URL parsing is shared**: `parseVideoUrl()` in `app/utils/video.ts` tells which URLs the player plays, for MarkdownPreview and your own code. It now also recognises YouTube `shorts` and `live` URLs, and `m.youtube.com`.

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
