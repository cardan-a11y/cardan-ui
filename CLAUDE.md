# Cardan UI

Accessible Vue 3 component library for Nuxt 4 in TypeScript, distributed as a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers).

Base frontend guidelines (architecture, CSS design system, WCAG 2.2 requirements) live in the parent `../CLAUDE.md` and apply here too.

## Component Categories

### Form Components

- **Input**: Text input with accessibility features
- **Textarea**: Multi-line text input
- **Select**: Dropdown selection component
- **MultiSelect**: Multi-option selection (uses [@vueform/multiselect](https://vueform.com/multiselect/))
- **Checkbox**: Single checkbox with group support
- **CheckboxGroup**: Multiple checkbox management
- **Radio**: Radio button with group support
- **RadioGroup**: Radio button group management
- **Switch**: Toggle switch component
- **DatePicker**: Date selection component (uses [Vue DatePicker](https://vue3datepicker.com/))
- **FileInput**: File upload component
- **RangeInput**: Slider/range input component
- **Search**: Search input with suggestions
- **Form**: Form wrapper with validation support
- **RequiredChip**: "Required" chip next to the label of required form fields

### Layout & Navigation

- **Card**: Content container component
- **Accordion**: Collapsible content sections
- **AccordionDetails**: Accordion content wrapper
- **Tabs**: Tabbed interface component
- **MenuList**: Navigation menu component
- **MenuListTooltip**: Menu with tooltip support
- **MobileMenu**: Mobile-optimized navigation
- **Pagination**: Page navigation component
- **Spacer**: Layout spacing utility
- **SkipLink**: Accessibility skip navigation

### Interactive Elements

- **Button**: Primary button component
- **CopyButton**: Copy-to-clipboard functionality
- **Dialog**: Modal dialog component
- **Popover**: Floating content overlay
- **Tooltip**: Contextual help text (uses the native Popover API and CSS anchor positioning)
- **ProgressCircle**: Circular progress indicator
- **ProgressMeter**: Linear progress bar
- **Skeleton**: Loading state placeholder

### Data Display

- **Table**: Data table component
- **Chip**: Tag/label component
- **Ellipsis**: Text truncation with expand
- **Callout**: Highlighted information box (`solid` (default) and `outline` variants)
- **Markdown**: Markdown rendering and editing
  - MarkdownEditor: Rich text editor (uses [md-editor-v3](https://imzbf.github.io/md-editor-v3/))
  - MarkdownPreview: Markdown display (uses [markdown-it](https://markdown-it.github.io/) and [highlight.js](https://highlightjs.org/))

### Utility Components

- **CardanLogo**: Cardan logo in full, symbol and tile forms, with color variants and sub-brand lockups (e.g. `product="academy"`); the product name is always set in Hanken Grotesk
- **FocusLoop**: Keyboard navigation management to trap focus inside a container
- **LanguageSelect**: Language switcher to switch between English and Dutch
- **ThemeSelect**: Theme selection
- **ThemeToggle**: Theme toggle switch to toggle between light and dark mode
- **UserMenu**: User account menu
- **VideoPlayer**: Video playback component to play videos from YouTube or Vimeo (uses [YouTube](https://developers.google.com/youtube/iframe_api_reference) and [Vimeo](https://developer.vimeo.com/player/sdk/embed) APIs)

## Cardan Auth UI layer

The [auth/](auth/) directory is a separate, opt-in Nuxt layer (`@cardan/auth-ui`) with the sign-in and MFA forms for Nuxt SPAs backed by Laravel Fortify. Projects extend it next to Cardan UI, as a peer: `github:cardan-a11y/cardan-ui/auth`. It is not part of the base layer because it adds pages and needs `nuxt-auth-sanctum`, which most projects do not use. Its documentation is in [auth/README.md](auth/README.md).

- **Pages**: `/login`, `/forgot-password`, `/reset-password`, `/two-factor-authentication` and `/mfa-setup`, in the `AuthPage` frame (the Cardan Academy design, which Cardan Auditor adopts too). An app overrides a page by creating one at the same path
- **Components**: `AuthPage`, `LoginForm`, `AuthError`, the password forms (`PasswordForgotForm`, `PasswordResetForm`, `PasswordUpdateForm`, `PasswordRequirements`, `PasswordReveal`), `MfaSettings`, `LogoutDialog`, `PasswordConfirmationDialog` and the MFA flow (`MfaChallenge`, `MfaSetup`, `MfaDialog`, `MfaQr`, `MfaCode`, recovery codes, …)
- **Composables**: `useAuth`, `useMfa`, `useMfaDialog`, `usePasswordConfirmation`, `useMfaSetupReminder`, `usePasswordPolicy`, `useLoginEmail`, `useLogoutDialog`, `useCardanAuthConfig` (wrapping `nuxt-auth-sanctum` and the app config), plus the `mfa-setup` middleware and the 403 plugin behind the setup reminder
- Copy lives in the layer's `auth`, `mfa` and `password` messages; apps override keys. Buttons use the `black` (main actions) and `ghost` (secondary) variants; there are no button slots
- The endpoints and the password policy are settings under `cardanAuth` in the app config, with the Cardan Academy API's paths as defaults (`auth/app/app.config.ts`, read through `useCardanAuthConfig()`); an app whose API still serves Fortify's own password routes overrides them in its `app.config.ts` (see the Backend and Configuration sections of auth/README.md). `extractAuthError()` reads both Laravel's error shape and the JSON:API envelope
- The layer uses the Cardan UI components and tokens only, with no tokens of its own
- The demo is the Auth UI section of the playground (`/auth`), backed by mock Fortify endpoints in `.playground/server/routes`; its pages render client-side only, like the SPAs that use the layer

## Utilities Available

- **datetime**: Date and time formatting
- **file**: File handling utilities
- **markdown**: Markdown processing
- **sort**: Sorting algorithms
- **index**: General utility functions

## Usage Patterns

### Basic Component Usage

```vue
<script setup>
import { Button } from '@cardan/ui';

function handleClick() {
  console.log('Button clicked');
}
</script>

<template>
  <Button label="Click me" variant="primary" @click="handleClick" />
</template>
```

## CSS Variables

All global CSS variables for color, spacing, typography, etc. are declared in [main.css](app/assets/main.css). The layer does not load this file: it is the Cardan template that each consuming project copies into its own `main.css` (a stylesheet shipped by the layer would add a render-blocking request). The playground imports it from [playground.css](.playground/assets/playground.css).

- The `--cardan-*` primitives hold the brand palette; components never use them, only the semantic `--color-*` tokens do.
- Components use tokens without fallbacks: `var(--token)`, not `var(--token, var(--other))`. When a component needs a new token, add it to `main.css` and to the token list in [MIGRATION.md](MIGRATION.md), with a value that keeps the current look of existing projects.
- Every text and graphic token pair must meet WCAG 2.2 AA contrast (4.5:1 for text, 3:1 for graphics) in light and dark mode. Never fix a contrast failure by inventing a new color; use a brand token.
- Text and icons on tinted (`-bg`) surfaces use the matching `--color-*-text` token; every `-text` token must reach 4.5:1 on its `-bg` surface.

## Nuxt Layer Integration

Cardan UI can be used in two different ways:

### 1. Extend from local folder (Development)

```ts
defineNuxtConfig({
  extends: ['../cardan-ui'],
});
```

### 2. Extend from GitHub repository (Development / Production)

[GitHub repository](https://github.com/cardan-a11y/cardan-ui)

```ts
defineNuxtConfig({
  extends: ['github:cardan-a11y/cardan-ui'],
});
```

## Icon Usage Guidelines

Cardan UI components support icons through the `icon` prop, powered by [@nuxt/icon](https://nuxt.com/modules/icon) and Iconify. This provides access to over 200,000 open-source vector icons.

### Icon Library Preference

We primarily use the **Material Symbols** library for consistency across the design system:

- **Preferred**: `material-symbols` with rounded variants
- **Default Style**: `outline-rounded` (outlined icons with rounded corners)
- **Alternative**: `rounded` (filled icons with rounded corners) when design requires
- **Fallback**: Default rounded variant (no suffix) when outline variant is not available
- **Fallback**: Default variant (no suffix) when both outline and rounded variants are not available

### Icon Usage Examples

```vue
<template>
  <!-- Using outline-rounded variant (preferred) -->
  <Button icon="material-symbols:home-outline-rounded" label="Home" />

  <!-- Using rounded variant (without outline suffix) when the design requires it -->
  <Button icon="material-symbols:star-rounded" label="Favorite" />

  <!-- Using default variant when no rounded variants are available -->
  <Button icon="material-symbols:account-circle" label="Profile" />

  <!-- Other components with icon support -->
  <Input icon="material-symbols:search-rounded" label="Search" />
  <Chip icon="material-symbols:check-rounded" label="Completed" />
</template>
```

### Icon Naming Convention

Material Symbols icons follow this pattern:

- `material-symbols:{icon-name}-{variant}`
- Common variants: `outline-rounded`, `rounded`, `outline`, `sharp`

### Finding Icons

1. **Browse**: Visit [Material Symbols collection](https://icones.js.org/collection/material-symbols) on icones.js.org
2. **Search**: Use the search functionality to find specific icons
3. **Preview**: Hover over icons to see their names and variants
4. **Filter**: Use the variant filters to find outline-rounded, rounded, or default variants

### Icon Best Practices

- **Consistency**: Stick to Material Symbols library when possible
- **Accessibility**: Icons are usually used to support text labels, because by default they are hidden from screen readers. They should be accompanied by text labels or proper ARIA labels.
- **Size**: Icons automatically scale with the component's size
- **Performance**: Icons are loaded on-demand to keep bundle size minimal
- **Layout Shift**: When an icon causes layout shift, add it to the `defaultIcons` array in [.playground/utils/defaultIcons.ts](.playground/utils/defaultIcons.ts) (used by [.playground/nuxt.config.ts](.playground/nuxt.config.ts))

### Icon Selection Process

When suggesting an icon:

1. First check Material Symbols collection on icones.js.org
2. Prefer outline-rounded variants
3. Use rounded variants when design requires filled icons
4. Fall back to default variants when rounded options aren't available
5. Always consider accessibility implications

## Documentation

The playground is available at `http://localhost:3003` and serves as interactive documentation with live examples of nearly all components showcasing most of their props.

### External Dependencies & Documentation

#### UI & Interaction

- **[@vueform/multiselect](https://vueform.com/multiselect/)**: Multi-select dropdown component
- **[Vue DatePicker](https://vue3datepicker.com/)**: Date picker component used in DatePicker
- **[compressorjs](https://github.com/fengyuanchen/compressorjs)**: Image compression utility for FileInput component

#### Markdown Extensions

- **[markdown-it](https://markdown-it.github.io/)**: Markdown parser used in MarkdownPreview component
- **[highlight.js](https://highlightjs.org/)**: Syntax highlighting for code blocks in MarkdownPreview
- **[md-editor-v3](https://imzbf.github.io/md-editor-v3/)**: Rich markdown editor used in MarkdownEditor component
- **[@mdit/plugin-attrs](https://github.com/mdit-vue/mdit-plugin-attrs)**: HTML attributes support
- **[@mdit/plugin-mark](https://github.com/mdit-vue/mdit-plugin-mark)**: Mark syntax support

#### Accessibility Testing

- **[axe-core](https://github.com/dequelabs/axe-core)**: Accessibility testing
- **[vue-axe](https://github.com/vue-a11y/vue-axe)**: Vue.js accessibility testing integration for playground

## MCP Integration

For real-time, detailed project structure information, connect to the Nuxt MCP endpoint at `http://localhost:3003/__mcp/sse` during development.
