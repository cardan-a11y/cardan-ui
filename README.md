# Cardan UI

Accessible Vue component library for [Nuxt](https://nuxt.com) in TypeScript.

Cardan UI is a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers) in a public repository. You can extend from the [GitHub repository](https://github.com/cardan-a11y/cardan-ui).

## Development

- Run `pnpm i` to install dependencies
- Run `pnpm run dev` to start the development server on [localhost:3003](http://localhost:3003)

## Browser support

Cardan UI targets evergreen browsers. Tooltip, Popover and UserMenu place their content with the Popover API and CSS anchor positioning, with `position-try-fallbacks` to flip it when there is no room. Tooltip and Popover anchor it to their `popovertarget` button, its implicit anchor; UserMenu anchors its panel to the box of the header's height around its avatar button, so the panel opens under the header's line. A browser without anchor positioning (Safari before 26, Firefox without the `layout.css.anchor-positioning.enabled` flag) still opens and closes them, but without `placement` and `span`: the content shows at its static position, which can be away from the trigger (UserMenu's panel then covers the header, from the trigger's start edge on).

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
