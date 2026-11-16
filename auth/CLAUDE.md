# Cardan Auth UI layer

This directory is a separate, opt-in Nuxt layer (`@cardan/auth-ui`) with the sign-in and MFA forms for Nuxt SPAs backed by Laravel Fortify. Projects extend it next to Cardan UI, as a peer: `github:cardan-a11y/cardan-ui/auth`. It is not part of the base layer because it adds pages and needs `nuxt-auth-sanctum`, which most projects do not use. Its documentation is [README.md](README.md).

- **Pages**: `/login`, `/forgot-password`, `/reset-password`, `/two-factor-authentication` and `/mfa-setup`, in the `AuthPage` frame (the Cardan Academy design, which Cardan Auditor adopts too). An app overrides a page by creating one at the same path.
- `useCardanAuthConfig` wraps `nuxt-auth-sanctum` and the app config; the `mfa-setup` middleware and the 403 plugin are behind the setup reminder.
- Copy lives in the layer's `auth`, `mfa` and `password` messages; apps override keys. Buttons use the `black` (main actions) and `ghost` (secondary) variants; there are no button slots.
- The endpoints and the password policy are settings under `cardanAuth` in the app config, with the Cardan Academy API's paths as defaults (`app/app.config.ts`, read through `useCardanAuthConfig()`); an app whose API still serves Fortify's own password routes overrides them in its `app.config.ts`. The forms show their errors in the base layer's ErrorMessage.
- The layer uses the Cardan UI components and tokens only, with no tokens of its own.
- The demo is the Auth UI section of the playground (`/auth`), backed by mock Fortify endpoints in `../.playground/server/routes`; its pages render client-side only, like the SPAs that use the layer.
