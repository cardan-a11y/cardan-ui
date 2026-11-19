import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Workarounds that hold for one major.minor of a dependency, or its internals:
 * an entry fails once the installed version leaves `checked`; then remove the
 * workaround, or confirm it and update `checked`. Its comment points here.
 */
interface Tripwire {
  /** What the workaround does, the name of its test */
  name: string;
  package: string;
  /** major.minor of `package`, or the range `parent` declares for it */
  checked: string;
  /** Reads `checked` as the range this package lists in `dependencies` */
  parent?: string;
  where: string;
  check: string;
}

const tripwires: Tripwire[] = [
  {
    name: 'DatePicker renders its own input in the library slot',
    package: '@vuepic/vue-datepicker',
    checked: '14.0',
    where: 'app/components/DatePicker.vue, test/browser/containers.spec.ts',
    check:
      'the `dp-input` slot props and the key handler the input calls, the classes of the library input; whether Shift+Tab out of the calendar still drops focus (the test.fixme)',
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
    name: 'vitest-axe matchers augment vitest by hand',
    package: 'vitest-axe',
    checked: '0.1',
    where: 'test/vitest-axe.d.ts',
    check: 'whether the release augments `vitest` itself',
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
    name: 'global-types references the layer types',
    package: 'nuxt',
    checked: '4.6',
    where: 'modules/global-types.ts',
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
    name: 'the logout dialog skips logout() without a session',
    package: 'nuxt-auth-sanctum',
    checked: '3.1',
    where: 'auth/app/composables/useLogoutDialog.ts',
    check:
      'whether `logout()` still throws without a session, and still awaits the `sanctum:logout` hook before its redirect',
  },
];

const root = resolve(__dirname, '..');

function manifest(pkg: string): {
  version: string;
  dependencies?: Record<string, string>;
} {
  return JSON.parse(
    readFileSync(resolve(root, 'node_modules', pkg, 'package.json'), 'utf8'),
  );
}

describe('tripwires', () => {
  it.each(tripwires)('$name', (entry) => {
    const found = entry.parent
      ? manifest(entry.parent).dependencies?.[entry.package]
      : manifest(entry.package).version.split('.').slice(0, 2).join('.');
    const version = entry.parent
      ? `${found} in ${entry.parent}`
      : manifest(entry.package).version;

    expect(
      found,
      `${entry.package} is now ${version}: re-check ${entry.where} (${entry.check}), then remove the workaround or update this entry.`,
    ).toBe(entry.checked);
  });
});
