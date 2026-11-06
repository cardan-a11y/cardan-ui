# Upgrading Cardan UI

This guide is for developers of projects that extend the layer. Each section says what a project must do or check for a release: new tokens for its `main.css`, renamed props or classes, modules or CSP hosts. The components read their design tokens from the project's own `main.css`, a copy of the template in [`app/assets/main.css`](app/assets/main.css), so a token a release adds has to be pasted there.

A release that needs nothing from projects has a one-line section that says so; what it changed is in the playground's changelog ([`.playground/pages/changelog.vue`](.playground/pages/changelog.vue)). The projects are kept up to date, so the file only holds the five most recent releases that ask something of them, with the one-line sections in between: each release that asks something removes the notes older than that. Older notes are in the history of this file (`git log -p MIGRATION.md`).

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
- **The cardan plugin**: run `claude plugin update cardan@cardan-ui --scope user`. In cardan-lms-nuxt and cardan-auditor-nuxt, work goes into `develop` and reaches `main` through one release pull request (`/cardan:release`), from the releases of 3 November 2026 on.

### 2.3.3

2.3.3 needs nothing from projects.

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

2.3.6 needs nothing from projects.

### 2.3.7

2.3.7 is a round of accessibility and form fixes, with the card surface and gradient of the brand book. Paste the token values below into your `main.css`; the rest keeps working, but check the items after it.

- **Paste these token values into your `main.css`**: the card surface of the brand book (Kaart, `#FBFAF9`, where cards were white), the new brand gradient `--gradient-bg` (once per page, under a card), and two graphics that failed the 3:1 that borders, icons and indicators need. Dark `--color-red-graphic` was 2.66:1 on the page and is 3.42:1, and it draws every error border, also the new one of a required Checkbox; light `--color-yellow-graphic` was 2.77:1 and is 3.37:1. cardan-cms-nuxt keeps its own dark red, which passes.

  ```css
  :where(:root) {
    --cardan-card: #fbfaf9;
    --gradient-bg: linear-gradient(
      in srgb 110.32deg,
      var(--color-accent-bg) 0%,
      var(--color-green-bg) 76.34%
    );
  }

  :where(.light-mode) {
    --color-card-bg: var(--cardan-card);
    --color-yellow-graphic: hsl(45 80% 36%);
  }

  :where(.dark-mode) {
    --color-red-graphic: var(--cardan-error);
  }
  ```

- **A required Checkbox is checked by the form.** `required` now sets `required` on the input, so a Form does not submit while the box is unticked: it moves focus to the box and shows "Tick this box to continue" under it, or your `error-message`. A check of your own after submit no longer runs; move its text to `error-message` (cardan-lms-nuxt's checkout terms). For a group, pass `required` to CheckboxGroup, which asks for one box, not to every box (cardan-cms-nuxt's `StatamicCheckboxGroup`), or each box shows the error.
- **Tabs puts an attribute on its wrapper only.** Until now every attribute on `<Tabs>`, a `class`, an `id`, an `aria-labelledby`, landed on the wrapper and on the tablist. CSS that selected the class on the tablist (`.tablist.my-tabs`) matches nothing now, and an `aria-labelledby` names the wrapper instead of the tablist; use the `aria-label` prop for the tablist's name. The projects select their classes on the wrapper, which keeps working. The arrow keys act on `keydown` and no longer scroll the page; Home and End go to the first and last tab.
- **Select, CheckboxGroup and RadioGroup type their options.** `options` is `T[]`, and `value-key`, `label-key`, `disabled-key`, `name-key` and `title-key` must name a field of `T`: a key that is not in the option type is a type error now, which is the point. An untyped array keeps working. The option types are `SelectOption` and `GroupOption`.
- **Focus returns to the element that opened a Dialog when it closes**, also with Escape; until now it fell to the page, because the rest of the page was still `inert` when the browser restored it. A dialog that moved focus itself on close keeps doing so.
- **Focus moves on Vue's next tick instead of after a timer** in FocusLoop, UserMenu, AvatarButton, MobileMenu and MarkdownEditor, so it lands as soon as the element exists, also with reduced motion. A test that waited for the old timer can read focus right after the next tick.
- **LanguageSelect and LanguageSwitcher list the locales of the i18n config** (`locales` from `useI18n()`), with the `name` and `language` of each. The radio ids are `language-option-<code>` (were `-english` and `-dutch`). A third language needs an entry in the config and, for DatePicker, its date-fns locale in `dateFnsLocales` in `DatePicker.vue`.
- **`useCookiesDialog()` no longer returns `cookiesDialogRef`.** Open the dialog with `openCookiesDialog()`, or set `cookiesDialogOpen`; CookiesDialog follows the flag. The shared state keys are `cardan-ui:cookie-consent`, `cardan-ui:cookies-dialog-open` and `cardan-ui:toasts` (were `cookieConsent`, `cookiesDialogRef` and `toasts`); read them through `useCookiesDialog()` and `useToast()`, never with `useState()` directly. The `cookieConsent` browser cookie keeps its name, so saved choices stay valid.
- **The layer bundles the icons its components show on first paint, and the ones two or more projects use** (`bundledIcons` in `app/utils/icons.ts`, through `icon.clientBundle.icons` in its `nuxt.config.ts`; a project's own list is merged with it). **Install `@iconify-json/svg-spinners` and `@iconify-json/material-symbols`** if your project lacks one (cardan-support has no `svg-spinners`): a listed icon whose collection is missing fails the production build, whether a page shows it or not. Then remove those icons from your own `icon.clientBundle.icons`: in cardan-lms-nuxt `material-symbols:close-rounded`, `material-symbols:more-horiz` and `svg-spinners:90-ring-with-bg`.
- **MobileMenu renders its dialog on the server** through Nuxt's `#teleports`, always: the `teleport-to` prop is removed. No project passed it.
- **`useDate()` reads the locale through `useI18n()`**, so call it in `setup`, as the components do; it no longer works from a plugin, a store or a callback outside a component. No project calls it there.
- **The field components render through the new FormField component**: the label with its chip, the control, the error text and the instruction, in that order. The classes are the same (`.form-field-wrapper`, `label`, `.instruction`, `.error-wrapper`), so CSS keeps working. Two things change: the error text sits directly under the field in every field, above the instruction, where Select and Textarea showed it below; and an Input without a `label` renders no empty `<label>`.
- **FileInput keeps the chosen file as its value** while an image is compressed, and the compressed file replaces it; the value no longer goes empty in between. A watcher on the value sees the chosen file first and then the compressed one.
- **A link in a markdown text ends in hidden text "(open in new window)"** in the current language, and gets that title only when it has none of its own. The icon after the link is decorative now; CSS that changed its alternative text can go.
