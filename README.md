# Cardan UI

Accessible Vue component library for [Nuxt](https://nuxt.com) in TypeScript, distributed as a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers) from a [public GitHub repository](https://github.com/cardan-a11y/cardan-ui).

The components are brand-agnostic. The Cardan brand lives in the design tokens of [`app/assets/main.css`](app/assets/main.css), a template that each project copies into its own `main.css`.

## Usage

A project extends the layer from the `main` branch:

```ts
defineNuxtConfig({
  extends: ['github:cardan-a11y/cardan-ui'],
});
```

The [`auth/`](auth/) directory holds Cardan Auth UI, a separate layer with the sign-in and MFA forms for Nuxt SPAs backed by Laravel Fortify. A project that needs it also extends `github:cardan-a11y/cardan-ui/auth`; see [auth/README.md](auth/README.md).

## Development

Run `pnpm i` to install the dependencies, then `pnpm run dev` to start the playground on [localhost:3003](http://localhost:3003).

## Browser support

Cardan UI supports these browsers:

- Chrome 131 and later
- Edge 131 and later
- Firefox 148 and later
- Safari 26 and later, on macOS and iOS

Tooltip, Popover, UserMenu and ComboBox show their content with the Popover API and place it with CSS anchor positioning. UserMenu and ComboBox use `anchor-scope`, which sets the Chrome and Edge versions. Tooltip and Popover use `position-try-order`, which sets the Firefox version. An older browser still opens and closes these components, but may show their content away from the trigger.

## What the layer configures

A project gets this configuration from the layer and does not need to copy it; its own configuration still wins ([how layers merge](https://nuxt.com/docs/getting-started/layers)).

- **Fonts**: [`@nuxt/fonts`](https://fonts.nuxt.com) loads Hanken Grotesk from Google, weights 400 to 800, normal and italic, `latin` and `latin-ext`.
- **Vite prebundling**: the packages of the layer's components are added to `vite.optimizeDeps.include`, but only those the project has installed.
- **Video thumbnails**: [`image.domains`](https://image.nuxt.com/get-started/configuration#domains) lists `i.ytimg.com` and `i.vimeocdn.com` for VideoPlayer.
- **Icons**: [`@nuxt/icon`](https://nuxt.com/modules/icon/bundles) bundles the icons the components show on first paint, scans the project's templates for more, and allows a bundle of 256 kB. The layer sets no `provider`: `@nuxt/icon` picks `'iconify'` for an SPA (`ssr: false`) or a static site and `'server'` otherwise. With `'server'`, the layer's `fallbackToApi: 'server-only'` keeps the browser away from Iconify's API: an icon outside the bundle comes from the project's own server. With `'iconify'` the browser loads such an icon from Iconify's API itself; an SPA that wants its server's endpoint instead sets `provider: 'server'`.
- **Languages**: [`@nuxtjs/i18n`](https://i18n.nuxtjs.org) has the locales `nl` (the default, without a prefix) and `en`. A project with its own locale files keeps its own `i18n.locales` list, or those files are not loaded.
- **Markdown images**: `app.config.ts` holds `cardan.markdownImageHosts`, empty: MarkdownPreview's safe mode shows an image only from the page's own origin or a host on that list, and makes any other image a link. A project lists the first-party hosts its texts' images come from, such as its upload bucket (`defineAppConfig({ cardan: { markdownImageHosts: ['cdn.example.com'] } })`), and never a third party's. Its `img-src` in a Content Security Policy can then be the same list.
- **The rest**: color mode with the class suffix `-mode`, `<html lang>` and `dir` from the locale, Nuxt DevTools off, and `runtimeConfig.public.gtmId` for CookiesDialog.
- **Google Tag Manager**: with `runtimeConfig.public.gtmId` (`NUXT_PUBLIC_GTM_ID`) set, CookiesDialog registers Tag Manager behind a consent trigger, so the script loads only after Accept, or on a later visit when the stored choice is Accept. A project never registers Tag Manager itself, since a second `useScriptGoogleTagManager()` loads it at once; it sends its own events with `useCookiesDialog().pushDataLayer(event)`, which drops them until the visitor has accepted. A project whose layout mounts CookiesDialog sets a test id in its browser suite's server environment, as the layer's own suite does (`test/browser/serve.mjs`), and answers the request for `gtm.js` with `otherOrigins.answer()` in the tests that accept: the other-origin guard then fails any test in which Google is asked for something before an Accept. `/cookies` in the playground shows a first visit.

## What a project installs

The layer does not install the packages below. A missing one only shows in a production build: there the layer is a copy without `node_modules`, while in development and CI the checkout next to the project resolves every import. Keep each within the version range of the layer's `package.json`.

Every project needs the modules the layer registers, `@vueuse/core`, and the two icon collections of the bundled icons:

```bash
pnpm add \
  @nuxt/eslint \
  @nuxt/fonts \
  @nuxt/icon \
  @nuxtjs/color-mode \
  @nuxtjs/i18n \
  @vueuse/nuxt \
  @vueuse/core \
  @iconify-json/material-symbols \
  @iconify-json/svg-spinners
```

A project that uses one of these components also needs its packages. The two modules at the end also go in the project's `modules` in `nuxt.config.ts`.

```bash
# FileInput
pnpm add compressorjs

# MarkdownPreview
pnpm add markdown-it @mdit/plugin-attrs @mdit/plugin-mark highlight.js

# MarkdownEditor
pnpm add md-editor-v3 markdown-it @mdit/plugin-attrs @mdit/plugin-mark highlight.js

# DatePicker
pnpm add @vuepic/vue-datepicker date-fns

# MultiSelect (deprecated for ComboBox, removed in the next minor)
pnpm add @vueform/multiselect

# VideoPlayer, or a video link in MarkdownPreview
pnpm add @nuxt/image

# CookiesDialog, or YouTube (deprecated for VideoPlayer, removed in the next minor)
pnpm add @nuxt/scripts
```

The auth layer's `nuxt-auth-sanctum` is the same case; see its README.

FileInput loads compressorjs only once an image is chosen, in a chunk of its own, but the build still resolves it, so a project that uses FileInput installs it even for `mode="document"` alone.
