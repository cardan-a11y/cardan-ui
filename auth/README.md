# Cardan Auth UI

Accessible authentication UX for [Nuxt](https://nuxt.com) SPAs backed by [Laravel Fortify](https://laravel.com/docs/fortify), in TypeScript.

Cardan Auth UI is a [Nuxt Layer](https://nuxt.com/docs/getting-started/layers) in a public repository. It ships the sign-in pages and the whole MFA flow — login, forgot and reset password, the second factor at sign-in, setting up MFA, account settings for MFA and the password, signing out — in the Cardan design, so an app extends the layer instead of rebuilding them.

The pages render inside your app's default layout; an app overrides one by creating a page at the same path. Copy is in the layer's messages, so an app changes a sentence by overriding its key, and the endpoints it calls and the password policy it shows are settings in your app config (see [Configuration](#configuration)).

## Dependencies

This layer does **not** stand on its own. Extend it alongside its two dependencies:

| Dependency                                                            | Why                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Cardan UI](https://github.com/cardan-a11y/cardan-ui)                 | Supplies every component used here (`Button`, `Card`, `Dialog`, `Form`, `Input`, `CopyButton`), the `@nuxtjs/i18n` / `@nuxt/icon` / `@nuxtjs/color-mode` module setup, and the **design tokens** all styling in this layer is written against. Extend it as a layer — a peer of this one, not a nested dependency. |
| [nuxt-auth-sanctum](https://github.com/manchenkoff/nuxt-auth-sanctum) | Provides `useSanctumClient()` and `useSanctumAuth()`, which this layer calls for the Fortify endpoints. Install it as a module in your app.                                                                                                                                                                        |

### Design tokens

Every rule in this layer styles with Cardan UI tokens, the colors, font sizes and radii Cardan UI documents. It has no tokens of its own:

`--color-text` · `--color-grey-text` · `--color-grey-light` · `--color-card-bg` · `--color-white` · `--color-red-text` · `--color-red-bg` · `--color-green-graphic` · `--font-size-sm|md|lg|xxl|xxxl` · `--font-weight-bold` · `--radius-sm|md`

Cardan UI's `app/assets/main.css` is a template rather than an auto-loaded stylesheet: each app keeps its own palette and scale under those names, as it already does for Cardan UI components. If your app renders Cardan UI correctly, this layer inherits the same theming, dark mode included, with no extra CSS.

The dividers in `LoginForm` and the MFA dialogs are drawn as a 1px `--color-grey-light` line, so they don't depend on how your app resets `<hr>`.

The recovery code list shows two columns when two codes fit side by side and one column otherwise, so a code never breaks across lines at any font size.

The submit buttons on the login form and sign-in challenge are `--font-size-md`, the buttons in the MFA dialogs `--font-size-sm`.

### Overriding styles

The layer's own class names are stable hooks you can restyle from your app: `.login-form`, `.auth-error`, `.mfa-dialog`, `.mfa-setup`, `.mfa-challenge-wrapper`, `.mfa-code-input`, `.mfa-recovery-codes-card`.

`.auth-error` is deliberately _not_ your app's `.error-message`. Reusing that class would mean two global definitions of one selector resolving by source order, and your error component's CSS chunk is not necessarily loaded on the page a login form sits on. `.auth-error` is written purely in tokens, so it picks up your palette and dark mode; restyle it if your errors look different elsewhere:

```css
.login-form .auth-error {
  min-width: 100%;
}
```

## How to extend from Cardan Auth UI in your project

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    'github:cardan-a11y/cardan-ui/auth',
    'github:cardan-a11y/cardan-ui',
  ],

  modules: ['nuxt-auth-sanctum'],
});
```

When you develop the layers side by side locally, point at the checkouts instead:

```ts
export default defineNuxtConfig({
  $development: {
    extends: ['../cardan-ui/auth', '../cardan-ui'],
  },

  $production: {
    extends: [
      'github:cardan-a11y/cardan-ui/auth',
      'github:cardan-a11y/cardan-ui',
    ],
  },
});
```

### Backend

The layer calls these endpoints, relative to your configured `sanctum.baseUrl`: Fortify's own for sign-in and MFA, and the Cardan API's `/api/v1` paths for passwords. These are the defaults, the Cardan Academy API's; [Configuration](#configuration) shows how an app points them elsewhere.

| Endpoint                                        | Method                           | Config key                | Used for                                                       |
| ----------------------------------------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------- |
| `/api/user/two-factor-authentication`           | `POST` / `DELETE`                | `twoFactorAuthentication` | Enable / disable MFA                                           |
| `/api/user/two-factor-qr-code`                  | `GET`                            | `twoFactorQrCode`         | The setup QR code (inline SVG) and its `otpauth://` link       |
| `/api/user/confirmed-two-factor-authentication` | `POST`                           | `twoFactorConfirmation`   | Confirm the first code                                         |
| `/api/user/two-factor-recovery-codes`           | `GET` / `POST`                   | `twoFactorRecoveryCodes`  | Read / regenerate recovery codes                               |
| `/api/two-factor-challenge`                     | `POST`                           | `twoFactorChallenge`      | Second factor at sign-in                                       |
| `/api/user/confirmed-password-status`           | `GET`                            | `confirmedPasswordStatus` | Whether the password was confirmed recently                    |
| `/api/user/confirm-password`                    | `POST`                           | `confirmPassword`         | Confirm the password                                           |
| your `sanctum.endpoints.login`                  | `POST`                           |                           | Sign in (path taken from your Sanctum config)                  |
| `/api/v1/auth/forgot-password`                  | `POST`                           | `forgotPassword`          | Request a reset link (`email`)                                 |
| `/api/v1/auth/reset-password`                   | `POST`                           | `resetPassword`           | Set a new password from the reset link                         |
| `/api/v1/profile/password`                      | `PATCH` (`updatePasswordMethod`) | `updatePassword`          | Change the password while signed in                            |
| `/api/v1/password-policy`                       | `GET`                            | `passwordPolicy`          | `{ data: { min_length, max_length } }`, or `false` without one |

Enable Fortify's `two-factor-authentication` feature with `confirm: true`. Leave Fortify's `resetPasswords` feature off: its routes tell a known address from an unknown one. The password endpoints take Fortify's fields (`token`, `email`, `password`, `password_confirmation`, `current_password`) and answer a known and an unknown address identically. Errors may come in Laravel's shape (`{ message, errors: { field: [...] } }`) or as a JSON:API envelope (`{ errors: [{ detail, source: { parameter } }] }`); `extractAuthError()` reads both. Point the reset email at your app's `/reset-password` page with `?token=…&email=…`; a mail without the `email`, such as Fortify's own, gets a visible email field on that page.

The user payload tells the layer whether MFA is on: `mfa_enabled`, plus `mfa_required` (a role or organization requires it) and `mfa_exempt` (never remind this account). Without `mfa_enabled` the setup reminder stays off.

### Configuration

The settings live under `cardanAuth` in the app config, with the Cardan Academy API as the default (`app/app.config.ts` in the layer). Nuxt merges the app config of every layer, so an app overrides single keys in its own `app/app.config.ts`, and code reads them with `useCardanAuthConfig()`. An API that still serves Fortify's own password routes, and has no policy endpoint, sets:

```ts
// app/app.config.ts
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

| Key                                     | Default         |                                                                                                                                                 |
| --------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `endpoints.*`                           | the paths above | Relative to `sanctum.baseUrl`. Sign-in, sign-out, the identity and the CSRF cookie stay in the `sanctum` config                                 |
| `updatePasswordMethod`                  | `'PATCH'`       | `'PUT'` for Fortify's own `/user/password` route                                                                                                |
| `passwordPolicy.minLength`, `maxLength` | `14`, `128`     | Shown until the policy endpoint answers, or as the policy when `endpoints.passwordPolicy` is `false`. `maxLength: null` sets no maximum         |
| `passwordPolicy.serverChecks`           | `true`          | Whether the API also refuses breached and common passwords and ones with personal information on save; the forms list those checks when it does |

## Usage

### Pages

The layer registers these pages. They render in your app's default layout, in the `AuthPage` frame (the Cardan symbol, a centred title and description, the form and a footer link):

| Page                         |                                                                            |
| ---------------------------- | -------------------------------------------------------------------------- |
| `/login`                     | `LoginForm`, then on to the `?redirect=`, past `/mfa-setup` for a reminder |
| `/forgot-password`           | Requests a reset link                                                      |
| `/reset-password`            | The page the reset email links to; signs the user in afterwards            |
| `/two-factor-authentication` | The second factor at sign-in                                               |
| `/mfa-setup`                 | Sets up MFA after sign-in, skippable unless the account requires MFA       |

Give the frame a height from your layout so the form sits in the middle of the viewport, e.g. `.auth-page-content { min-height: calc(100svh - 72px - 80px); }`. To replace a page, create one at the same path in your app; render `<AuthPage>` in it to keep the frame.

Change the copy by overriding message keys in your app's locale files, e.g. `auth.login-description` or `auth.confirm-logout`.

### Signing in

The `/login` page renders `<LoginForm />`; use it on its own in a login page of your app. It posts to the login endpoint from your Sanctum config, refreshes the identity, and redirects following the same `redirect.keepRequestedRoute` / `redirect.onLogin` rules nuxt-auth-sanctum applies itself — and when Fortify answers `two_factor: true` it sends the user to the challenge page instead, carrying the `?redirect=` along.

The defaults render email, password with a reveal button, error region, rule, then the submit button.

```vue
<script setup lang="ts">
// With nuxt-auth-sanctum's global middleware on, use
// `sanctum: { guestOnly: true }` instead: `sanctum:guest` only exists with it off.
definePageMeta({ middleware: ['sanctum:guest'] });

// Share the typed address with the forgot-password form beside it.
const { userEmail } = useUserProfileDetails();
</script>

<template>
  <Card>
    <LoginForm v-model:email="userEmail" />
  </Card>
</template>
```

#### Making it look like your app

Everything variable is a small prop. The Cardan Academy form remembers the session, shows the error below the button, and holds the spinner through the page transition:

```vue
<LoginForm
  remember
  error-position="below-submit"
  :loading-delay="lgTransition"
/>
```

#### Button variants

The buttons of every form and dialog in this layer have the Cardan look: `black` for the main actions (sign in, enable, continue, confirm, done), `ghost` for skip, back and cancel, and `danger` for disabling MFA.

| Prop                 | Default                        |                                                                       |
| -------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `showPasswordToggle` | `true`                         | Reveal-password button beside the password field                      |
| `divider`            | `false`                        | Rule between the fields and the submit button                         |
| `remember`           | `false`                        | Send `remember: true` with the credentials                            |
| `errorPosition`      | `'above-submit'`               | Or `'below-submit'`                                                   |
| `size`               | `'lg'`                         | Input size                                                            |
| `autofocus`          | `true`                         | Focus the email field on mount                                        |
| `shake`              | `true`                         | Shake the fields when credentials are rejected                        |
| `twoFactorPath`      | `'/two-factor-authentication'` | Where to go when a second factor is needed                            |
| `loadingDelay`       | `0`                            | Hold the submit button loading this many ms after the request settles |

| Slot     | Scope       |                                                              |
| -------- | ----------- | ------------------------------------------------------------ |
| `error`  | `{ error }` | The error region                                             |
| `fields` |             | Extra fields after the password, e.g. a remember-me checkbox |
| `footer` |             | Anything at the end of the form                              |

| Model / Event   |                                                                                   |
| --------------- | --------------------------------------------------------------------------------- |
| `v-model:email` | Optional. Bind it to share the address with a sibling form; local state otherwise |
| `@success`      | Credentials accepted and the identity refreshed                                   |
| `@two-factor`   | Credentials accepted, second factor required                                      |
| `@error`        | Login rejected, with the error payload                                            |

### Sign-in challenge

The layer registers the page **`/two-factor-authentication`** for you, and `LoginForm` sends the user there on its own — nothing to wire up. It reads the `?redirect=` and continues there once the second factor is accepted, offers a recovery code as an alternative to the app code, and renders inside your app's default layout.

To give the challenge your own frame, create `pages/two-factor-authentication.vue` in your app (a page in your app wins over the layer's) and render `<MfaChallenge />` in it. Pass `:card="false"` when your frame already surrounds the form. Copy the page meta `sanctum: { guestOnly: true }` from the layer's page: the user is not signed in until the code is accepted. To use another route, also point `LoginForm`'s `twoFactorPath` at it.

### Enabling, disabling and recovery codes

Mount the two dialogs once on the page that holds your account settings, and drive them from `useMfaDialog()`:

```vue
<script setup lang="ts">
const { user, refreshUser } = useMyAuth();

const {
  openMfaEnableDialog,
  openMfaDisableDialog,
  openMfaRecoveryCodesDialog,
} = useMfaDialog();
</script>

<template>
  <Button
    v-if="user.mfaEnabled"
    :label="$t('mfa.disable')"
    variant="outline"
    @click="openMfaDisableDialog()"
  />

  <Button
    v-else
    :label="$t('mfa.enable')"
    variant="outline"
    @click="openMfaEnableDialog()"
  />

  <Button
    v-if="user.mfaEnabled"
    :label="$t('mfa.recovery-codes-show')"
    variant="outline"
    @click="openMfaRecoveryCodesDialog()"
  />

  <MfaDialog @refresh="refreshUser()" />

  <MfaRecoveryCodesDialog />
</template>
```

`MfaDialog` emits **`refresh`** once MFA has actually been turned on or off. The layer already refreshes the Sanctum identity itself; handle `refresh` to re-sync any copy of the user your app keeps of its own, so an "MFA enabled" badge updates immediately.

If that handler takes the user elsewhere after MFA is turned off (say, back to a setup page because MFA is required), pass `:show-disable-result="false"`. The dialog then skips its "MFA is off" step and keeps the disable button loading until your handler closes it with `closeMfaDialog()`.

Whether MFA is currently on stays your app's call — the flag lives in your `/api/user` response, and its name differs per backend, so the layer never guesses at it.

### Setting up MFA on a page

`MfaSetup` walks the same enable flow as `MfaDialog` — intro → QR code → confirm code → recovery codes — inline, for a page instead of a dialog: a prompt after sign-in, or a step in onboarding. Its step headings are `h2`, so give the page its own `h1`; `mfa.setup-title` and `mfa.setup-description` are there for it. To free up the room once the flow is underway, drop that title and pass `:heading-level="1"`: the step heading becomes the page's `h1`, in the app's own `h1` style, and the headings inside the steps move up with it. When the page's own title and description already introduce MFA, pass `:show-intro="false"` so the intro step does not repeat it with a heading and description of its own.

```vue
<template>
  <h1>{{ $t('mfa.setup-title') }}</h1>
  <p>{{ $t('mfa.setup-description') }}</p>

  <MfaSetup
    @refresh="refreshUser()"
    @skip="navigateTo('/')"
    @done="navigateTo('/')"
  />
</template>
```

| Prop        | Default |                                                                  |
| ----------- | ------- | ---------------------------------------------------------------- |
| `skippable` | `true`  | Offer "Skip for now" before MFA is on. Turn off to require setup |
| `autofocus` | `false` | Focus the intro heading on mount                                 |

| Event      |                                                                       |
| ---------- | --------------------------------------------------------------------- |
| `@skip`    | The user chose to set up MFA later                                    |
| `@done`    | MFA is on and the user confirmed they stored the recovery codes       |
| `@refresh` | MFA has actually been turned on — re-sync your app's copy of the user |

The buttons follow the [button variants](#button-variants) of your app config.

### Passwords

`/forgot-password` and `/reset-password` use `PasswordForgotForm` and `PasswordResetForm`. The forgot form starts from the address typed on the login page (`useLoginEmail()`). After a reset the user is signed in: straight on, or through the sign-in challenge when the account has MFA.

`PasswordUpdateForm` changes the password while signed in, for an account settings page, and shows a toast when it is saved. Both password forms list the requirements with `PasswordRequirements` and check the length while the user types, read from the policy endpoint, or from the `passwordPolicy` settings for an API without one (see [Configuration](#configuration)). Every password field has a reveal button (`PasswordReveal`); in the reset and update forms the one beside the last field reveals them all. When the reset link carries no `?email=`, the reset form asks for the address.

### Account settings for MFA

`<MfaSettings />` shows whether MFA is on and offers to enable it, show the recovery codes, or disable it, with the two dialogs mounted for you. For an account that requires MFA, disabling becomes "set up MFA again": the dialog skips its "MFA is off" step and sends the user to `/mfa-setup`.

### Setup reminder

When the user payload has `mfa_enabled: false`, a sign-in on `/login` detours past `/mfa-setup` before continuing (once per sign-in, kept in sessionStorage). With `mfa_required` the page offers no skip, and the layer's middleware sends the user back there on every navigation. When the API answers `403` with the code `mfa_setup_required` or `backoffice_mfa_required` mid-session, the layer re-reads the user and goes to `/mfa-setup` too.

### Signing out

Mount `<LogoutDialog />` once, in your layout, and open it with `useLogoutDialog().logoutDialogRef.value?.openDialog()`. It asks before signing out.

### Password confirmation

With `confirmPassword` on in Fortify's `twoFactorAuthentication` feature (recommended, and Fortify's default), every two-factor settings route sits behind `password.confirm` and answers **423** until the user has re-entered their password. The layer handles that for you: mount `<PasswordConfirmationDialog />` once, in your layout (it names the account to password managers with a hidden `autocomplete="username"` field, the `email` of your user payload unless you pass `username`), and every MFA call asks for the password when Fortify does and then retries. `openMfaDisableDialog()` asks up front instead, before the MFA dialog opens. `openMfaEnableDialog()` opens the intro straight away; its Enable button asks for the password, on top of the MFA dialog, and cancelling that keeps the intro open.

The confirmation holds for your app's `auth.password_timeout`. For a sensitive change, keep that short: Laravel's default is three hours.

For changes of your own behind `password.confirm`, use the same composable:

```ts
const { ensurePasswordConfirmed, withPasswordConfirmation } =
  usePasswordConfirmation();

// Ask up front, before opening a flow…
if (!(await ensurePasswordConfirmed())) return;

// …or only when the server answers 423, and retry once.
await withPasswordConfirmation(() =>
  client('/api/sensitive', { method: 'POST' }),
);
```

`requestPasswordConfirmation(afterConfirm)` takes an optional function that runs once the password is accepted, before the dialog closes, with its Confirm button still loading. `openMfaRecoveryCodesDialog()` uses it to load the codes, so the user sees one action in progress from Confirm until the codes appear.

### Changing the authenticator app

Fortify has no "swap" for the second factor, and its undocumented `force` re-enable replaces the live secret and recovery codes before the new app is confirmed, which can lock the user out. The way to move to a new app or phone is Fortify's own: switch MFA off (behind the password confirmation above) and set it up again. An app that requires MFA should hold the session at its setup page until the new app is confirmed; `mfa.change-app-description` is there to explain that.

## API

### `useAuth()`

The app's authentication surface, wrapping nuxt-auth-sanctum so app code has one place to reach for:

|                                                                         |                                                                                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`                                                                | The Sanctum fetch client — this is what most call sites want                                                                                                                 |
| `user`, `isAuthenticated`, `init`, `login`, `logout`, `refreshIdentity` | Passed through from `useSanctumAuth()`                                                                                                                                       |
| `loginWithoutRedirect(credentials)`                                     | Posts the credentials and returns the raw response, without fetching the identity or redirecting — both wrong while a second factor is pending                               |
| `loginRedirectTarget()`                                                 | Where to go after a successful login, following your Sanctum `redirect` config. A `?redirect=` only counts when it is a path within your app. `false` when the app opted out |
| `userName`, `userInitials`                                              | Read off the payload's `name`, for avatars                                                                                                                                   |

`user` is typed as `{ data: AuthUser } | null`, and **`AuthUser` is an empty interface for your app to fill** by declaration merging. Put this anywhere in your app's types:

```ts
declare global {
  interface AuthUser extends User {}
}
```

Every `useAuth().user` in your app is then typed against your own payload, with no generics at the call sites. Anything specific to your backend — a `mfaEnabled` flag, roles, locale, an avatar URL — belongs in your app's own composable next to that type, not here.

### Other composables

|                         |                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `useLoginEmail()`       | The address typed on the login page, shared with the forgot-password page          |
| `usePasswordPolicy()`   | `minLength`, `maxLength` and `serverChecks` of new passwords                       |
| `useCardanAuthConfig()` | The `cardanAuth` settings of the app config, see [Configuration](#configuration)   |
| `useLogoutDialog()`     | `logoutDialogRef` to open `LogoutDialog`, and `handleLogout()`                     |
| `useMfaSetupReminder()` | `mfaEnabled`, `mfaRequired`, `needsMfaSetup` and the reminder used by `/mfa-setup` |

### `useMfaDialog()`

|                                             |                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openMfaEnableDialog()`                     | Opens `MfaDialog` on the enable flow: intro → QR code → confirm code → recovery codes                                                                                    |
| `openMfaDisableDialog()`                    | Opens `MfaDialog` on the disable confirmation                                                                                                                            |
| `closeMfaDialog()`                          |                                                                                                                                                                          |
| `openMfaRecoveryCodesDialog()`              | Fetches the current recovery codes, then shows them                                                                                                                      |
| `closeMfaRecoveryCodesDialog()`             |                                                                                                                                                                          |
| `mfaDialogRef`, `mfaRecoveryCodesDialogRef` | The underlying `Dialog` refs, if you need them                                                                                                                           |
| `loadingMfaRecoveryCodesDialog`             | Loading state for the button that opens the recovery codes. Only set while the codes load without a password prompt; with one, the prompt's Confirm button loads instead |

### `useMfa()`

The state and endpoint calls behind the components: `mfaStep`, `mfaCredentials`, `mfaError`, `qrCode`, `qrCodeUrl` (the `otpauth://` link in the QR code), `setupKey` (its secret), `recoveryCodes`, the `loading*` flags, and `enableMfa()`, `disableMfa()`, `getQrCode()`, `enterCode()`, `getRecoveryCodes()`, `generateRecoveryCodes()`, `solveMfaChallenge()`, `resetMfa()`.

Reach for it to build your own flow. For the standard one, `useMfaDialog()` plus the two dialogs is all you need.

### Components

| Component                                                             |                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `AuthPage`                                                            | The frame of the sign-in pages                               |
| `LoginForm`                                                           | Email + password sign-in, aware of a pending second factor   |
| `PasswordForgotForm`, `PasswordResetForm`                             | Request a reset link, set a new password from it             |
| `PasswordUpdateForm`                                                  | Change the password while signed in                          |
| `PasswordRequirements`                                                | The password rules, with the length checked while typing     |
| `PasswordReveal`                                                      | The reveal-password toggle beside a password field           |
| `MfaSettings`                                                         | MFA status and actions for an account settings page          |
| `LogoutDialog`                                                        | Asks before signing out                                      |
| `MfaDialog`                                                           | The enable/disable flow, all six steps. Emits `refresh`      |
| `MfaSetup`                                                            | The enable flow inline on a page, with an optional skip      |
| `MfaRecoveryCodesDialog`                                              | Shows and regenerates recovery codes                         |
| `MfaChallenge`                                                        | The second-factor form used by the challenge page            |
| `MfaCode`, `MfaRecoveryCode`                                          | The two inputs, with their validation and error region       |
| `MfaQr`, `MfaEnableResult`, `MfaDisableResult`, `MfaRecoveryCodeList` | Steps of the flow, reusable on their own                     |
| `MfaSetupKey`                                                         | The setup key as text, with a copy button                    |
| `AuthError`                                                           | Renders a Fortify error or validation payload                |
| `PasswordConfirmationDialog`                                          | Asks for the password when Fortify's `password.confirm` does |

`MfaQr` connects the authenticator app two ways. On a desktop the QR code leads, with the setup key behind a "can't scan?" toggle. On a phone (a coarse pointer below 480px), where the app is usually on the same device, a link that opens the app leads (the `otpauth://` link Fortify's QR code endpoint returns next to the SVG), with two fallbacks behind toggles: the setup key, for apps that do not open from the link, and the QR code, for another device.

`MfaEnableResult` and `MfaRecoveryCodeList` take a `headingLevel` (2–4) for the "Recovery codes" heading at the top of the codes card: `MfaEnableResult` defaults to 2, and `MfaRecoveryCodeList` shows no heading without one, since a dialog about recovery codes already says so in its title. Pick the level one below the heading the codes sit under; `MfaSetup` uses 3.

## Translations

English and Dutch ship in `i18n/locales`, under the `auth`, `mfa`, `password` and `password-confirmation` namespaces. `@nuxtjs/i18n` deep-merges the messages of every layer, so these arrive alongside your app's own namespaces without any configuration. Override a single string by declaring the same key in your app's locale file — the app's message wins.

The `mfa` namespace also holds the strings an app needs around these components — `mfa.setup-title` and `mfa.setup-description` for a setup page (`mfa.setup-required-description` when the user cannot skip it), `mfa.status-on`, `mfa.status-off` and `mfa.change-app-description` for an account settings page, `mfa.organization-required*` for an organization setting that requires MFA of every member — so every MFA string lives in one place.

The `password` namespace holds every password string: the field labels, the forgot, reset and update forms, and `password.requirements.*` for the policy `GET /api/v1/password-policy` describes — a minimum length checked while typing, and the breach, common-password and personal-information checks the API runs on save.

The layer also uses `general.back`, `general.continue`, `general.confirm`, `general.done`, `general.sign-in` and `general.email` from Cardan UI.

`AuthError` shows the API's validation messages as the backend sends them. Send `Accept-Language` from your app's locale and translate Laravel's messages in the backend; when the API answers with a `Content-Language` header, `AuthError` marks the messages with that `lang`, so screen readers announce them in the right voice (WCAG 3.1.2).

## Accessibility

Built to WCAG 2.2 AA, like everything at Cardan:

- Following a link between the sign-in pages (back to login, forgot password) puts focus at the top of the new page, in the `AuthPage` frame, so keyboard and screen reader users start reading from the top. On a fresh load, `LoginForm` focuses the email field instead.
- Each step moves focus deliberately — into the code input when the confirm step opens, and onto the other input when the user switches between an app code and a recovery code.
- The confirm button stays disabled until six digits are entered; the input declares `inputmode="numeric"`, `pattern`, `autocomplete="one-time-code"` and its own error message.
- Errors render in a `role="alert"` region.
- The QR code is exposed as `role="img"` with a translated name, and the written setup instructions sit beside it rather than only inside the image.
- Dialogs are native `<dialog>` elements from Cardan UI: modal focus trapping, `Escape` to close, and a labelled heading.
- The reveal-password button beside every password field (`PasswordReveal`) is a real toggle button carrying `aria-pressed`, not an icon that silently swaps meaning, and the fields declare `autocomplete="username"` / `"current-password"` (WCAG 1.3.5).

## Development

This layer lives in the `auth/` directory of the Cardan UI repository. From the repository root:

- Run `pnpm i` to install dependencies
- Run `pnpm run dev` and open the Auth UI pages of the playground on [localhost:3003/auth](http://localhost:3003/auth)
- Run `pnpm run lint` before opening a pull request

The Cardan UI playground extends this layer and demoes it under `/auth`. It talks to mock Fortify endpoints in `.playground/server/routes`: the password is always confirmed, any password signs in except `wrong`, and any MFA code is accepted except `000000`, which shows the validation error. The pages render client-side only, like the single-page apps that use the layer.
