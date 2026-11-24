import { resolve } from 'node:path';
import { tripwires, type Tripwire } from './tripwires';

/**
 * Workarounds that hold for one major.minor of a dependency, or its internals:
 * an entry fails once the installed version leaves `checked`; then remove the
 * workaround, or confirm it and update `checked`. Its comment points here.
 * The runner is test/tripwires.ts, which the projects use too.
 */
const entries: Tripwire[] = [
  {
    name: 'DatePicker renders its own input in the library slot',
    package: '@vuepic/vue-datepicker',
    checked: '14.1',
    where: 'app/components/DatePicker.vue, test/browser/datepicker.spec.ts',
    check:
      'the `dp-input` slot props and the key handler the input calls, the classes of the library input; whether the input handler still parses text that arrives without a key (a paste, a drop) while text input is off; whether Tab from an empty field still reaches the open calendar; whether the library still closes the calendar without moving focus (Escape, Shift+Tab on its menu), which `handleClose` makes up for',
  },
  {
    name: 'MultiSelect fixes Escape, the empty options and the dropdown placement',
    package: '@vueform/multiselect',
    checked: '2.6',
    where: 'app/components/MultiSelect.vue',
    check:
      'whether the library still blurs on Escape, asks an options function only on load, has no placement of its own, and leaves the props the wrapper casts out of its types',
  },
  {
    name: 'MarkdownEditor casts the markdown-it instance of md-editor-v3',
    package: 'markdown-it',
    parent: 'md-editor-v3',
    checked: '^14.0.0',
    where: 'app/components/Markdown/MarkdownEditor.vue',
    check: 'remove the cast once md-editor-v3 depends on markdown-it 15',
  },
  {
    name: "the axe helper casts to vitest-axe's matchers",
    package: 'vitest-axe',
    checked: '0.1',
    where: 'test/a11y.ts',
    check: 'whether the release types `vitest` itself, so the cast can go',
  },
  {
    name: 'error-origin reads the private _processingMiddleware',
    package: 'nuxt',
    checked: '4.6',
    where: 'app/plugins/error-origin.client.ts',
    check:
      'that `nuxtApp._processingMiddleware` is still set while page middleware runs',
  },
  {
    name: 'the error page keeps differing head tags out of layouts',
    package: 'nuxt',
    checked: '4.6',
    where: 'app/error.vue',
    check:
      'whether the client head still defers `dispose` until a page transition settles',
  },
  {
    name: 'the prepare:types hooks reference the layer types',
    package: 'nuxt',
    checked: '4.6',
    where: 'nuxt.config.ts, auth/nuxt.config.ts',
    check:
      "whether the generated tsconfig still excludes the consumer's node_modules for the layer's `app/`",
  },
  {
    name: 'html-lang reads the __DEFAULT_DIRECTION__ define',
    package: '@nuxtjs/i18n',
    checked: '10.6',
    where: 'app/plugins/html-lang.ts',
    check:
      'that the module still defines `__DEFAULT_DIRECTION__` at build time',
  },
  {
    name: 'the playground keeps nitroAutoImports for @nuxtjs/i18n',
    package: '@nuxtjs/i18n',
    checked: '10.6',
    where: '.playground/nuxt.config.ts',
    check:
      'whether the build passes without `nitroAutoImports` under compatibilityVersion 5',
  },
  {
    name: 'the playground keeps nitroAutoImports for @nuxt/image',
    package: '@nuxt/image',
    checked: '2.2',
    where: '.playground/nuxt.config.ts',
    check:
      'whether the build passes without `nitroAutoImports` under compatibilityVersion 5',
  },
  {
    name: 'solveMfaChallenge reads the route before the request',
    package: 'nuxt-auth-sanctum',
    checked: '3.1',
    where: 'auth/app/composables/useMfa.ts',
    check:
      'whether a 401 still navigates before the request settles, and where its own 401 handling goes',
  },
  {
    name: 'the challenge page uses guestOnly, not sanctum:guest',
    package: 'nuxt-auth-sanctum',
    checked: '3.1',
    where: 'auth/app/pages/two-factor-authentication.vue',
    check:
      'whether `sanctum:guest` is still registered only with `globalMiddleware` off',
  },
  {
    name: "the identity plugin depends on the module's plugin by name",
    package: 'nuxt-auth-sanctum',
    checked: '3.1',
    where: 'auth/app/plugins/identity.client.ts',
    check:
      "that the module's plugin is still named `nuxt-auth-sanctum` (`dependsOn`), and whether `client.initialRequest: false` still skips its own identity request",
  },
  {
    name: 'the logout dialog skips logout() without a session',
    package: 'nuxt-auth-sanctum',
    checked: '3.1',
    where: 'auth/app/composables/useLogoutDialog.ts',
    check:
      'whether `logout()` still throws without a session, and still awaits the `sanctum:logout` hook before its redirect',
  },
];

tripwires(resolve(__dirname, '..'), entries);
