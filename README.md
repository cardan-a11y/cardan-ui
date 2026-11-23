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

Tooltip, Popover, UserMenu and ComboBox show their content with the Popover API and place it with CSS anchor positioning. Tooltip and Popover anchor their content to their `popovertarget` button, its implicit anchor. UserMenu anchors its panel to the box of the header's height around its avatar button, so the panel opens under the header's line. ComboBox anchors its list to its field. UserMenu and ComboBox keep their anchor to themselves with `anchor-scope`, which sets the Chrome and Edge version. Tooltip and Popover choose the side with the most room through `position-try-order`, which sets the Firefox version: Firefox 147 turned anchor positioning on, but without that property.

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
