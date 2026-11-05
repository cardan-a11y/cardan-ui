# Upgrading Cardan UI

This guide is for developers of projects that extend the layer. Each section says what a project must do or check for a release: new tokens for its `main.css`, renamed props or classes, modules or CSP hosts. The components read their design tokens from the project's own `main.css`, a copy of the template in [`app/assets/main.css`](app/assets/main.css), so a token a release adds has to be pasted there.

The projects are kept up to date, so the file only holds the most recent releases: each release removes the notes of the oldest one. Older notes are in the history of this file (`git log -p MIGRATION.md`).

## Upgrading to 2.3

2.3 makes **MarkdownPreview** safe by default. Markdown in our apps often comes from someone other than the reader (an import, a colleague, an AI assistant), so the component no longer lets that text add markup or scripts. It also follows the second round of the Cardan brand book: the new product lockup of **CardanLogo**, a light favicon tile, the brand size of the md **Button**, and a primary Button that is white on purple in both modes, which replaces the `cta` Button.

### MarkdownPreview

- **Raw HTML shows as text** unless you add `trusted`. `<kbd>`, `<details>` or any other HTML in the text no longer renders as an element.
- **`{…}` sets only `lang`, `dir` and `class`** unless you add `trusted`. Event handlers (`{onclick=…}`), `style`, `id` and links are ignored. Until now every attribute was allowed.
- **A colour swatch** (`` `#ff0000` ``, `` `rgb(…)` ``, `` `hsl(…)` ``) only gets its colour for a plain colour value; anything after it no longer reaches the `style` attribute.
- **A class in `{…}` is still allowed**, so a text can apply any class of your page, for example one that hides it visually. It runs no script. Where that matters, search the stored text for `{.`.
- **Add `trusted` only for text your team wrote** and that needs HTML or other attributes. Never for text from users, imports or an AI.
- **No margin outside the text**: the first child has no top margin and the last no bottom margin. Remove your own resets, such as a `.markdown--no-margin` class or `:first-child { margin-block-start: 0 }` on `.cardan-markdown-preview`.
- **Wide tables** scroll on their own instead of the page (reflow at 320px): each table is in a scroll region (`.markdown-table`, named "Table") that takes keyboard focus, and the table keeps its table semantics. CSS that set `display: block` or `overflow` on `.cardan-markdown-preview table` can go.
- **New `inline` prop** for a title or label: inline markup only (emphasis, code, links), in a `<span>` that is valid inside a button, link, label or heading, in the size around it. Use it instead of a `<div>` in those places, and instead of rendering inline markdown with `v-html` yourself.
- **New `heading-offset` prop** moves the text's own headings down, so its `##` fits under the heading of the section that shows it: `:heading-offset="1"` turns `##` into `<h3>`.

Before you upgrade, check your stored markdown for HTML and attributes, for example in SQL:

```sql
-- HTML tags, and attribute blocks with something other than lang, dir or class
SELECT id FROM chapters
WHERE content ~ '<[a-zA-Z/!]'
   OR content ~ '\{[^}]*\b(on[a-z]+|style|id|href|src)\s*='
   OR content ~ '\{[^}]*#[a-zA-Z]';
```

Add `trusted` where a field turns out to need it, or clean up the text.

### CardanLogo

- **Product lockups** have an upright divider between the logo and the product name, and the name starts with a capital (`product="academy"` shows Academy). The name is Body on light and white on dark, no longer purple, and 0.8 times the logo height. The lockup is wider than before: Academy at 20px is about 213px (was 159px at 16px).
- **The default height is 20px** (was 16px), the brand size for websites. The brand minimum is 18px, and 20px with a product name.
- **A lockup takes the room it gets** in a flex row such as an app header: from the narrow width (the new `narrow-width` prop, default `9rem`, 144px) up to its height, 20px by default. So it fits next to a menu button and two header buttons at 320px, as in Cardan Auditor and Cardan Academy, where Academy is 13.5px high, and grows to its full size where there is room. Below 320px it is the narrow width. Check that the lockup has room where your app shows it, also next to a sidebar toggle. Remove a `height` prop that only kept the logo at 16px.
- **`form="tile"`** is the color symbol on a white tile, for favicons, app icons and profile images; it stays light in dark mode. Add `variant="white"` for the white symbol on a purple tile, which the brand book keeps for dividing elements in social media posts. Replace your `favicon.svg` with the one in `.playground/public`: the light round tile with the symbol at 72% (the `tile` form keeps the brand's 56%, and 60% when `round`), so it is not too small in a 32px browser tab.

### Button and Popover

- **The primary Button** is white text on purple in both modes again (5.1:1 in dark mode), with the brand hover and a purple focus outline. It takes over the colours of the `cta` Button, and **the `cta` variant is removed**: replace `variant="cta"` with `variant="primary"`, and add `font-size="sm"` where you want to keep its 14px text. Add the three tokens the primary Button uses to your `main.css`. They have no fallback, so without them the primary Button has no fill and body-coloured text. 2.2 removed `--color-on-accent` and kept `--color-accent` only for a project's own CSS, and 2.2.1 removed `--color-accent-hover` from the template, so cardan-auditor-nuxt, cardan-lms-nuxt and cardan-support had none of them:

  ```css
  :where(.dark-mode) {
    --color-accent: var(--cardan-purple-on-dark);
    /* Purple fill with white text in both modes, for the primary Button: 5.1:1 */
    --color-accent-hover: color-mix(
      in srgb,
      var(--cardan-purple-on-dark) 85%,
      var(--cardan-dark-bg)
    );
    --color-on-accent: var(--cardan-white);
  }

  :where(.light-mode) {
    --color-accent: var(--cardan-purple);
    --color-accent-hover: var(--cardan-purple-hover);
    --color-on-accent: var(--cardan-white);
  }
  ```

  A project with its own palette (cardan-cms-nuxt, cardan-shop-nuxt) can keep the 2.2 primary Button, filled with the accent text colour, by pointing the tokens at the ones 2.2 used, in both modes:

  ```css
  --color-accent: var(--color-accent-text);
  --color-accent-hover: var(--color-accent-text-hover);
  --color-on-accent: var(--color-white);
  ```

- **The md Button** (the default size) has 16px text (was 14px) and 16px padding (was 12px plus 3px around the text), as the brand book's button. It is wider, so check rows of buttons and MenuLists, which use md buttons, at 320px. Set `font-size="sm"` (or `--button-font-size`) to keep the smaller text.
- **The md Popover** trigger has 16px text (was 14px), like the md Button.
- **Cardan Auth UI**: the buttons of `LoginForm`, `PasswordForgotForm`, `PasswordResetForm`, `MfaChallenge`, `MfaSetup` and `LogoutDialog` are lg (44px), like the other Auth UI dialogs. Check a page that overrides one of these forms.

### Grey graphics

`--color-grey-graphic` in light mode is Body 60% (`--cardan-body-60`, `#7e7c81`) instead of Always grey (`#7e7e77`), as in dark mode: the brand book replaces Always grey with Body 60%. Change it in your `main.css`, and delete `--cardan-always-grey` unless your own CSS uses it.

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

### Next release

**Accordion** follows the APG accordion pattern more closely; the component is unchanged for a project that does nothing, except that its panel is no longer a landmark.

- **New `h-tag` prop** wraps the trigger button in a heading (`h-tag="h3"`), at the level the section's title has in the page, as the pattern asks. Set it on every Accordion whose trigger is a title. A heading inside the `trigger` slot moves out: `<Accordion h-tag="h3"><template #trigger>Transcript</template>` instead of an `<h3>` in the slot, since a button may not contain a heading.
- **The panel is a plain `div`** and a `region` landmark only with the new **`region` prop**, with `aria-labelledby` to its trigger. Until now every panel was a `<section aria-labelledby>`, a landmark, and the pattern warns against a page full of them. Add `region` to a panel with headings or nested accordions of its own.
- **The trigger is in a wrapper** (`.accordion-header`, the heading or a `div`), so it is no longer a sibling of the panel. A selector such as `.accordion-trigger[aria-expanded='true'] ~ .accordion-panel-wrapper` in a project matches nothing now; the wrapper carries `.accordion-wrapper--open` instead.
- **The panel's overflow follows its state** also without a transition (reduced motion): a closing panel no longer paints over what follows, an opening one no longer clips focus outlines. Remove a workaround that set `overflow` on `.accordion-panel` from `aria-expanded`.
