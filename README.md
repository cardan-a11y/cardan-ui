# Cardan UI

Accessible Vue component library for [Nuxt](https://nuxt.com) in TypeScript.

Cardan UI is a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers) in a public repository. You can extend from the [GitHub repository](https://github.com/cardan-a11y/cardan-ui).

## Development

- Run `pnpm i` to install dependencies
- Run `pnpm run dev` to start the development server on [localhost:3003](http://localhost:3003)

## Browser support

Cardan UI supports the browsers below, from the version that has everything its components use.

- Chrome 131 and later
- Edge 131 and later
- Firefox 148 and later
- Safari 26 and later, on macOS and on iOS

Tooltip, Popover, UserMenu, ComboBox and MultiComboBox show their content with the Popover API and place it with CSS anchor positioning. Tooltip and Popover anchor their content to their `popovertarget` button, its implicit anchor. UserMenu anchors its panel to the box of the header's height around its avatar button, so the panel opens under the header's line. ComboBox and MultiComboBox anchor their list to their field. UserMenu and both comboboxes keep their anchor to themselves with `anchor-scope`, which sets the Chrome and Edge version. Tooltip and Popover choose the side with the most room through `position-try-order`, which sets the Firefox version: Firefox 147 turned anchor positioning on, but without that property.

An older browser is not supported. It still opens and closes these components, but it shows their content at its static position, which can be away from the trigger.

## Cardan Auth UI

The [`auth/`](auth/) directory holds Cardan Auth UI: a separate Nuxt layer with the sign-in and MFA forms for Nuxt SPAs backed by Laravel Fortify. Projects that need it extend it next to Cardan UI (`github:cardan-a11y/cardan-ui/auth`); see [auth/README.md](auth/README.md).

Cardan UI provides accessible, brand-agnostic components. The Cardan brand identity lives in the design tokens of [`app/assets/main.css`](app/assets/main.css), a template that each project copies into its own `main.css`.

## How to extend from Cardan UI layer in your project

### Extend from GitHub repository

Configuration below extends from main branch of repository:

```ts
defineNuxtConfig({
  extends: ['github:cardan-a11y/cardan-ui'],
});
```

## What the layer configures

A project that extends Cardan UI gets the configuration below from the layer, so it does not copy it from another project. Nuxt merges a project's own configuration with the layer's: a project that keeps its own copy of a key still works, and its own value wins where the two differ.

- **Fonts.** `@nuxt/fonts` loads Hanken Grotesk, the font of `main.css`, from Google only, with the weights 400 to 800 in normal and italic, for the `latin` and `latin-ext` subsets. It is a variable font, so the full range costs no more than 400 to 700. The template's `--font-weight-extrabold: 800` is the top of that range. A project that wants another range sets its own Hanken Grotesk entry in `fonts.families`: each option of the project's entry overrides the layer's.
- **Packages Vite prebundles in development.** The layer's module `modules/optimize-deps.ts` adds the packages its components import that Vite has to prebundle to `vite.optimizeDeps.include`: markdown-it, its two `@mdit` plugins and the highlight.js languages for MarkdownPreview, `@vuepic/vue-datepicker` and `date-fns` for DatePicker, `@vueform/multiselect` for MultiSelect, `compressorjs` for FileInput and `md-editor-v3` for MarkdownEditor. It adds a package only when the project installs it itself, so a project without MarkdownPreview gets no warning from Vite about a package it cannot find. A project lists its own other packages there as before.
- **Video thumbnails.** `image.domains` holds `i.ytimg.com` and `i.vimeocdn.com`, the hosts of VideoPlayer's thumbnails, in development and in production. The key only does something in a project that registers `@nuxt/image`, which the layer does not: VideoPlayer and the videos in MarkdownPreview need it. A project adds its own hosts to the list.
- **Icons.** `@nuxt/icon` puts the icons the layer's components show on first paint in the client bundle, scans the project's own templates for more (`clientBundle.scan`), and allows that bundle 256 kB (`clientBundle.sizeLimitKb`). The layer sets no `provider`: `@nuxt/icon` chooses it per project, `'iconify'` for an SPA (`ssr: false`) or a static site and `'server'` otherwise. With `'server'`, the layer's `fallbackToApi: 'server-only'` keeps the browser away from Iconify's API: an icon outside the bundle comes from the project's own server, which asks Iconify's API only for a collection the project does not install. With `'iconify'` that option is not read, and the browser loads an icon outside the bundle from Iconify's API itself. An SPA that wants its server's endpoint instead, as the Auditor does, sets `provider: 'server'` itself.
- **Languages.** `@nuxtjs/i18n` has the locales `nl` and `en`, in that order, with `nl` as the default and no prefix in the address. The order is that of LanguageSwitcher and LanguageSelect. A project with its own locale files keeps its own `i18n.locales` list, because the module loads a layer's locale files from that layer's own list: without one, the project's `nl.json` and `en.json` are not loaded. A project without locale files of its own needs no list.
- **The rest**: color mode with the class suffix `-mode`, the `lang` and `dir` of `<html>` from the locale, Nuxt DevTools off, and `runtimeConfig.public.gtmId` for CookiesDialog.

Two modules are left to the project, because not every project needs them. A project that shows videos, with VideoPlayer or a video link in MarkdownPreview, adds `@nuxt/image` to its `modules`. A project that uses YouTube or CookiesDialog adds `@nuxt/scripts`. The layer does not check whether a project has them.

The packages that some components are built on are left to the project too, for the same reason: a project installs the ones of the components it uses, in its own `package.json`. These are `compressorjs` for FileInput; `markdown-it`, `@mdit/plugin-attrs`, `@mdit/plugin-mark` and `highlight.js` for MarkdownPreview; `md-editor-v3` and all four of MarkdownPreview's for MarkdownEditor, which renders its preview and highlights its code the same way; `@vuepic/vue-datepicker` and `date-fns` for DatePicker; and `@vueform/multiselect` for MultiSelect. A missing package shows up only in a production build. The projects extend `github:cardan-a11y/cardan-ui` there, a copy without `node_modules`, so the build cannot resolve the component's import and fails, on Netlify as in a local `pnpm build`. In development and in CI the layer is the checkout next to the project, `../cardan-ui`, whose own `node_modules` hold every one of these packages, so the import resolves there and nothing shows that the project lacks it. Before a project uses one of these components for the first time, it adds the package with the same version range as the layer's `package.json`.

The same holds for what every project needs, whichever components it uses: the modules the layer registers (`@nuxt/eslint`, `@nuxt/fonts`, `@nuxt/icon`, `@nuxtjs/color-mode`, `@nuxtjs/i18n` and `@vueuse/nuxt`), `@vueuse/core`, which Toast, `useScreenSize()` and `useAppSidebar()` import, and the two Iconify collections of the layer's bundled icons, `@iconify-json/material-symbols` and `@iconify-json/svg-spinners`. Every project has them today; a new project installs them before its first production build. The auth layer's `nuxt-auth-sanctum` is the same case, as its README says.
