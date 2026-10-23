# Migrating to Cardan UI 2.0

Cardan UI 2.0 is an accessible UI component library. This guide is for developers of projects that extend the layer.

The components stay brand-agnostic: they read design tokens from your project's own `main.css`. A project keeps most of its current look until it adopts the Cardan tokens, but it does need the new tokens listed below, which bring the Cardan look to buttons, tracks and the backdrop.

## 1. Point your project at the new repository

```ts
defineNuxtConfig({
  extends: ['github:cardan-a11y/cardan-ui'],
  // or, for local development:
  // extends: ['../cardan-ui'],
});
```

## 2. Install `@nuxt/fonts`

The layer now registers `@nuxt/fonts`. Projects that do not have it yet (CAT-nuxt, CAT-dashboard, chart) need to install it:

```bash
pnpm add -D @nuxt/fonts
```

It only downloads fonts that your CSS uses. A project that keeps `system-ui` (or does not set `--font-family`) loads no fonts.

## 3. Add the new design tokens

Components use these tokens without fallbacks. Add them to your project's `main.css`. The values are the ones from the Cardan template in [`app/assets/main.css`](app/assets/main.css), so buttons, tracks and the backdrop take on the Cardan look. Only `--color-accent-hover` follows your own accent: it darkens `--color-accent`. The `--cardan-*` primitives they use are included; skip the ones your project already has:

```css
:where(:root) {
  --cardan-body: #28242d;
  --cardan-body-grey: #3d3644;
  --cardan-white: #ffffff;
  --cardan-beige-sand: #e8e1d9;
  --cardan-dark-block: #1e1e1f;

  --font-weight-semibold: 600;

  /* Buttons */
  --color-on-accent: var(--cardan-white);
  --color-accent-hover: color-mix(in srgb, var(--color-accent) 85%, black);

  /* Backdrop behind Dialog and MobileMenu */
  --color-backdrop: rgb(20 20 19 / 60%);
}

:where(.light-mode) {
  /* Buttons */
  --color-secondary: var(--cardan-beige-sand);
  --color-secondary-hover: color-mix(
    in srgb,
    var(--cardan-beige-sand) 90%,
    var(--cardan-body)
  );

  /* Track of ProgressMeter, ProgressCircle and RangeInput */
  --color-track: var(--cardan-beige-sand);
}

:where(.dark-mode) {
  /* Buttons */
  --color-secondary: var(--cardan-dark-block);
  --color-secondary-hover: var(--cardan-body-grey);

  /* Track of ProgressMeter, ProgressCircle and RangeInput */
  --color-track: var(--cardan-body-grey);
}
```

cardan-lms-nuxt and CAT-nuxt already have all of these tokens. cardan-nuxt, tehv-nuxt, CAT-dashboard and chart need all of them.

### Tokens that were already missing before 2.0

Some projects did not define every token the components use, also before this release. Copy these from the layer's [`app/assets/main.css`](app/assets/main.css) when you migrate:

| Project       | Missing tokens                                                            |
| ------------- | ------------------------------------------------------------------------- |
| CAT-dashboard | `--line-height`, `--line-height-heading`                                  |
| chart         | Nearly all color, font, radius and duration tokens: it defines 10 of them |

## 4. Changes you will see despite the tokens

These changes are not driven by tokens, so they apply to every project:

- **Sizes**: md Button, Input, Select, MultiSelect and DatePicker are 40px high (was 36px), lg is 44px (was 40px).
- **Placeholders** in Input, Select and Textarea use `--color-grey-text` instead of `--color-grey-graphic`, for 4.5:1 contrast.
- **MultiSelect**: the highlighted (hovered or keyboard) option uses the accent color with `--color-on-accent` text; a highlighted selected option is green. Tags use `--color-accent-text`.
- **Progress and range tracks** are one neutral color (`--color-track`) instead of a tint per color, and their fills use the `-graphic` colors.
- **Colored Select** arrows use the `-text` color instead of the `-graphic` color.
- **Motion**: Toast slides and fades instead of bouncing; Accordion, ProgressMeter and ProgressCircle animate with `--duration-md` and `--cubic-bezier`; Tabs now animate their color change (a typo disabled this).
- **Disabled link buttons** get `role="link"` and `aria-disabled="true"`.
- **Inputs, Select, Textarea and DatePicker** use `--font-family-input` and fall back to `system-ui` when it is not set, as before.
- **Class names**: style `.cardan-multiselect`, `.cardan-datepicker(-container)` and `.cardan-markdown-preview`; the `krafters-*` classes are no longer rendered. CAT-nuxt (`FindingForm`, `CrawlerTestDialog`, `ActivityMapper`, `ProjectDetails`) and cardan-lms-nuxt (`main.css`) use them.
- **MarkdownEditor** no longer loads anything from unpkg or cdnjs: highlight.js and its code theme are bundled, and prettier and ECharts are disabled (neither was in the toolbar). You can remove the unpkg and cdnjs exceptions for md-editor-v3 from your Content Security Policy.
- **`useCookiesDialog`** stores the consent cookie with Nuxt's `useCookie` instead of `js-cookie`. Existing consent cookies stay valid. Projects can remove `js-cookie` unless their own code imports it: cardan-nuxt's `CookiesDialog.vue` does, so keep it there or switch that component to `useCookie` too.
- **DatePicker**'s visible label is now linked to its input. Before, the input had no id, so the label pointed to nothing.

## 5. Adopting the Cardan brand identity

When a project moves to the new identity, copy the tokens from the layer's [`app/assets/main.css`](app/assets/main.css) into its own `main.css`. That template contains:

- the brand palette as `--cardan-*` primitives, mapped to the semantic `--color-*` tokens for light and dark mode
- Hanken Grotesk (`--font-family`), the type scale and line heights
- 16px button text
- Body text on tinted surfaces, a neutral track and 12px card radius

Then use the new components and options where they fit:

- `<CardanLogo />` for the logo: full logo, symbol or tile, with automatic color-negative version in dark mode, and sub-brand lockups like `<CardanLogo product="academy" />`
- `<Callout />` now has a tinted surface by default; `<Callout variant="outline" />` keeps the white surface with a tinted border

The playground at [localhost:3003](http://localhost:3003) shows the Cardan template in light and dark mode.

## 6. Projects that use Cardan Auth UI

Cardan Auth UI (sign-in and the MFA flow) now lives in the `auth/` directory of this repository. Extend it next to Cardan UI, as a peer:

```ts
defineNuxtConfig({
  extends: [
    'github:cardan-a11y/cardan-ui/auth',
    'github:cardan-a11y/cardan-ui',
  ],
  // or, for local development:
  // extends: ['../cardan-ui/auth', '../cardan-ui'],

  modules: ['nuxt-auth-sanctum'],
});
```

The layer styles with the Cardan UI tokens only, so it needs no tokens of its own.

Remove any MFA composables or components your app still has from before the layer, such as CAT-nuxt's own `useMfa`. An app composable with the same name replaces the layer's auto-import, and the layer keeps its MFA state under the same `useState` keys (`mfaStep`, `qrCode`, `recoveryCodes`, `mfaError`, …), so the two would break each other.

## 7. Upgrading to 2.1

2.1 changes the font size scale, renames Button's `black` variant to `3d`, adds a new, basic `black` variant, adds two options to Chip, removes its `capitalize` prop, and changes the default look of Callout. It also adds a hover token for accent text and one for the ghost Button, removes the shadow tokens and Card's `shadow` prop, and makes Callout text and heading line height a little larger.

### New font size scale

Replace the `--font-size-*` tokens in your `main.css` with the new scale from the template in [`app/assets/main.css`](app/assets/main.css):

| Token                | 2.0       | 2.1      |
| -------------------- | --------- | -------- |
| `--font-size-xxxxxl` | 4rem      | removed  |
| `--font-size-xxxxl`  | 3rem      | 4rem     |
| `--font-size-xxxl`   | 2.5rem    | 3rem     |
| `--font-size-xxl`    | 2rem      | 2rem     |
| `--font-size-xl`     | 1.5rem    | 1.5rem   |
| `--font-size-lg`     | 1.25rem   | 1.125rem |
| `--font-size-md`     | 1rem      | 1rem     |
| `--font-size-sm`     | 0.875rem  | 0.875rem |
| `--font-size-xs`     | 0.75rem   | 0.75rem  |
| `--font-size-xxs`    | 0.6875rem | 0.625rem |
| `--font-size-xxxs`   | 0.625rem  | removed  |

Then update the sizes in your own components and `font-size` / `icon-size` props. TypeScript flags only the removed names (`xxxs`, `xxxxxl`); `xxs`, `lg`, `xxxl` and `xxxxl` still exist but have a different size, so search for those too:

- `xxxs` → `xxs` (same size)
- `xxxxl` → `xxxl` and `xxxxxl` → `xxxxl` (same size)
- `xxs` (11px) → `xs` (12px), the nearest size
- `xxxl` (40px) → `xxl` (32px) or `xxxl` (48px)
- `lg` (20px) stays `lg` and becomes 18px

Cardan UI's own components moved from the 11px `xxs` to `xs`, so their small text (field instructions and hints, errors, chips, small buttons, popovers) is 12px. This applies even if you keep the old scale. Components that use `lg` (menu items, dialog and toast icons, pricing cards, `icon-size="lg"`) become 18px once your `main.css` has the new scale. The one-time code digits of Cardan Auth UI use `--font-size-xxxl` (48px) instead of 40px.

### Component changes

- **Cardan Auth UI pages**: the layer now ships `/login`, `/forgot-password`, `/reset-password`, `/two-factor-authentication` and `/mfa-setup`, plus `PasswordUpdateForm`, `MfaSettings` and `LogoutDialog`. Delete your own versions, or keep a page by leaving it at the same path. The password forms call the Cardan API's paths (`POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`, `PATCH /api/v1/profile/password`, `GET /api/v1/password-policy`), so your API has to answer them, hardened as described in the Backend section of [`auth/README.md`](auth/README.md). Give `.auth-page-content` a `min-height` from your layout.
- **Cardan Auth UI buttons**: `LoginForm`'s `submit` slot and `MfaSetup`'s `actions` slot are removed. The auth buttons use the `black` variant for main actions and `ghost` for skip, back and cancel. `MfaChallenge` has a `card` prop to leave out its Card, and `loginRedirectTarget()` only follows a `?redirect=` to a path within the app.
- **Password messages moved to Cardan Auth UI**: the `password` namespace now ships with the auth layer instead of Cardan UI. Projects without the auth layer that use `password.*` keys must declare them in their own locale files. The requirement messages for numbers, symbols, uppercase and lowercase letters are removed, since the password policy no longer asks for them; `password.requirements.*` now covers the length, breach, common-password and personal-information checks.
- **Cardan Auth UI tokens removed**: the auth layer uses the font size scale and `--color-grey-light` directly. Delete the `--auth-color-divider` and `--auth-font-size-*` tokens from your `main.css`.
- **Text on tinted surfaces**: Chip, Callout and colored Select use the `--color-<color>-text` tokens on their tinted (`-bg`) surfaces. 2.1 removes the `--color-<color>-on-bg` tokens and `--color-on-secondary` (the secondary Button now uses `--color-text`), so delete them from your `main.css`. In light mode, `--color-orange-bg` is now a paler ochre, `color-mix(in srgb, var(--cardan-ochre-40) 40%, var(--cardan-white))`, to reach 4.5:1 with `--color-orange-text`.
- **`--color-grey-light` and `--color-grey-bg` swapped places**: `--color-grey-light` is now the darker neutral for borders and dividers, and `--color-grey-bg` the lighter surface for hovers and read-only fields. Update both tokens in your `main.css`: in light mode `--color-grey-light: var(--cardan-beige-sand)` and `--color-grey-bg: var(--cardan-beige-mid)`, in dark mode `--color-grey-light: var(--cardan-dark-border)` and `--color-grey-bg: var(--cardan-dark-block)`. Add the `--cardan-beige-mid: #ebe6e0` and `--cardan-dark-border: #282829` primitives if your project lacks them. Without this update, `--color-grey-bg` keeps the page background color in light mode, so the outline Button border and the hover of the outline, tab and menu Buttons become invisible. Check your own CSS that uses either token as well.
- **`variant="3d"`** is the old `black` look of Button: a rounded black button with an accent-colored offset shadow. Replace `variant="black"` with `variant="3d"` where you want to keep that look.
- **`variant="black"`** is now a plain button with light text on the text color and the default radius, as cardan-lms-nuxt's former `BaseButton` had.
- **Callout is `solid` by default**: a tinted surface with the `--color-<color>-text` text. The old default look is now `variant="outline"`, and `variant="default"` no longer exists. To keep the white surface with a tinted border, add `variant="outline"` to your callouts, and replace `variant="default"` with `variant="outline"`. Callouts with `variant="solid"` can drop the prop.
- **Chip's `capitalize` prop is removed**: use `text-transform="capitalize"` instead, which also capitalizes only the first letter of the label. CAT-nuxt's `FindingChips.vue` uses `capitalize` on a criterion number, where it has no visible effect: remove it there.

The new Chip options change nothing for projects that don't use them:

- **`variant="solid"`**: a filled background in the `--color-<color>-text` color with `--color-white` text, at least 4.5:1 for every color. In dark mode this gives a light background with dark text.
- **`textTransform`**: `uppercase`, `lowercase` or `capitalize`. `uppercase` also adds `letter-spacing: 0.025em` to keep the label legible. `capitalize` capitalizes only the first letter of the label, not every word like the CSS `text-transform` keyword. The new global `TextTransform` type can be used by other components too.

### Add `--color-accent-text-hover`

The sidebar Button uses `--color-accent-text-hover` as its hover text color. Components use it without a fallback, so add it to your `main.css`. In dark mode it is lighter than `--color-accent-text`, to stay above 4.5:1 on the dark surfaces. The Cardan template values are:

```css
:where(.light-mode) {
  --color-accent-text-hover: var(--cardan-purple-hover);
}

:where(.dark-mode) {
  --color-accent-text-hover: color-mix(
    in srgb,
    var(--cardan-purple-text-on-dark) 80%,
    var(--cardan-dark-text)
  );
}
```

Add the `--cardan-purple-hover: #763597`, `--cardan-purple-text-on-dark: #b768de` and `--cardan-dark-text: #fafaf9` primitives if your project lacks them.

`--color-accent-hover` stays the hover background of the primary and accent Buttons. Keep it: the text token is too light for white text in dark mode.

### Add `--color-ghost-hover-bg`

The ghost Button uses `--color-ghost-hover-bg` as its hover background. Components use it without a fallback, so add it to both `:where(.light-mode)` and `:where(.dark-mode)` in your `main.css`:

```css
--color-ghost-hover-bg: var(--color-grey-bg);
```

On a `--color-grey-bg` or `--color-grey-light` surface that hover is invisible or too faint, so such a surface sets the token to the page background. The grey (`blue`) Callout does this itself. Do the same on your own grey surfaces, such as a sidebar:

```css
.sidebar {
  --color-ghost-hover-bg: var(--color-bg);
}
```

### Shadows removed

- **Shadow tokens**: no component uses `--shadow`, `--shadow-1`, `--shadow-2`, `--shadow-3`, `--shadow-color`, `--shadow-offset` or `--shadow-offset-hover` any more, and the template no longer has them. Delete them from your `main.css`, unless your own CSS uses them.
- **Card's `shadow` prop is removed**: Cards have no shadow. Remove `shadow` from your Cards; to keep a shadow, add a `box-shadow` to the Card's class in your own CSS.
- **`variant="3d"`** keeps its accent-colored offset shadow, set in Button itself. A project value for `--shadow-offset` or `--shadow-offset-hover` no longer changes it. To change the shadow, set `--button-shadow-offset` and `--button-shadow-offset-hover` on `.button-variant--3d`.

### Other changes

- **Callout text is 14px**: the default `font-size` is `sm` instead of `xs` (12px). Add `font-size="xs"` to keep the smaller text.
- **`--line-height-heading`** is 1.25 instead of 1.15 in the template. Update it in your `main.css` to follow the template. Without the token, headings fall back to 1.25 as well.
- **Sidebar Button**: the icon takes the text color, the hover color is `--color-accent-text-hover`, and the link to the current page is underlined in `--color-accent-text`.
- **`useCookiesDialog`** only holds the consent state and the `acceptCookies` and `denyCookies` actions. `CookiesDialog` now loads GTM and applies the saved choice, so a page sends one consent update however many components call the composable (before, each call sent its own). Render `<CookiesDialog />` once in your layout; without it, GTM no longer loads.
- **MenuList**: group labels are bold, the hover color is `--color-accent-text` instead of `--color-accent`, and the link to the current page is underlined in the text color instead of the accent color.

## 8. Upgrading to 2.2

2.2 makes the endpoints and the password policy of Cardan Auth UI configurable, gives every password field a reveal button, lets the reset page ask for the email address when the reset link has none, and sets the product name of `CardanLogo` in Hanken Grotesk whatever font the project uses.

### Cardan Auth UI settings

The endpoints the auth layer calls and the password policy it shows are settings under `cardanAuth` in the app config, with the Cardan Academy API's paths as the defaults (`auth/app/app.config.ts`). Nothing changes for an app on those paths. An app whose API still serves Fortify's own password routes, with no policy endpoint, overrides them in its `app/app.config.ts`:

```ts
export default defineAppConfig({
  cardanAuth: {
    endpoints: {
      forgotPassword: '/api/forgot-password',
      resetPassword: '/api/reset-password',
      updatePassword: '/api/user/password',
      passwordPolicy: false,
    },
    updatePasswordMethod: 'PUT',
    passwordPolicy: { minLength: 8, maxLength: null, serverChecks: false },
  },
});
```

With `serverChecks: false` the forms list only the length rule. The Configuration section of [`auth/README.md`](auth/README.md) describes every key.

### Password forms

- `PasswordResetForm` and `PasswordUpdateForm` have a reveal-password button beside their last field, which reveals all their password fields, as `LoginForm` has beside its password field; `PasswordConfirmationDialog` has one too. The button is the new `PasswordReveal` component, which also owns the `.password-input-wrapper` rule that `LoginForm` used to carry.
- `PasswordResetForm` shows a required email field when the reset link has no `?email=`, as Fortify's own reset mail. A link with the address keeps the hidden field.
- `usePasswordPolicy()` also returns `serverChecks`.

### CardanLogo

The product name in a lockup such as `<CardanLogo product="auditor" />` is set in Hanken Grotesk, as brand artwork, instead of the project's `--font-family`. `@nuxt/fonts`, registered by the layer, serves the font from the project itself; a project on another font downloads one weight of it for the logo, since no other text uses it.
