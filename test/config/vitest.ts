import { globSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dependenciesOf } from './serve.mjs';

/**
 * The vitest options a project that extends the layer shares with the others.
 * It imports only Node built-ins and serve.mjs, and returns a plain object: the project
 * passes it to its own `defineVitestConfig`, so @nuxt/test-utils is the
 * project's, never the checkout's:
 *
 * ```ts
 * // vitest.config.ts of a project
 * import { defineVitestConfig } from '@nuxt/test-utils/config';
 * import { cardanVitestConfig } from '../cardan-ui/test/config/vitest.ts';
 *
 * export default defineVitestConfig(
 *   cardanVitestConfig({
 *     root: import.meta.dirname,
 *     setupFiles: ['./test/setup.ts'],
 *     sanctumClient: true,
 *   }),
 * );
 * ```
 *
 * - **dedupe**: every package in the project's package.json resolves from the
 *   project, not from ../cardan-ui/node_modules: without it a layer file loads
 *   a second Vue and rendering fails ("Cannot read properties of null (reading
 *   'ce')").
 * - **inline**: the libraries the layer's components wrap (DatePicker's,
 *   MultiSelect's, MarkdownEditor's) go through Vite with the project's Vue,
 *   also when the project does not install them; `inline` adds more.
 * - **`#layer-test`**: set here for vitest, to this checkout's `test/`. For
 *   `pnpm run typecheck` the project adds the tsconfig path in its
 *   `$development` block (`typescript.tsConfig.compilerOptions.paths`), never
 *   in the production config.
 * - **sanctumClient**: lists test/api-setup.ts, which mocks nuxt-auth-sanctum's
 *   client for every test with the API fake of test/api.ts.
 * - **failOnConsole**: lists test/console-setup.ts, which fails a test that
 *   writes to `console.error` or `console.warn` (a Vue warning among them)
 *   unless it names the message with `expectConsole()` (test/console.ts).
 *   Opt-in until each project's suite is clean with it.
 * - **restoreMocks**: every spy goes back before each test, the first one
 *   included, so a spy made at the top of a file or in `beforeAll` is gone
 *   before a test reads it: move it into `beforeEach` first. Opt-in.
 *
 * The layer's own vitest.config.ts does not use it: the layer is the checkout
 * and needs no dedupe.
 *
 * `cardanVitestProjects()` takes the same options and splits the suite in
 * two vitest projects: the files of `shared` in one Nuxt app per worker
 * (`isolate: false`), every other file in an app of its own. A shared file
 * puts back what its tests change; a file that mocks a module is never
 * shared, as the mock would not reach a module the app has loaded already.
 * The project passes its own `defineVitestProject` and uses vitest's
 * `defineConfig`, since `defineVitestConfig` refuses projects:
 *
 * ```ts
 * import { defineConfig } from 'vitest/config';
 * import { defineVitestProject } from '@nuxt/test-utils/config';
 * import { cardanVitestProjects } from '../cardan-ui/test/config/vitest.ts';
 *
 * export default defineConfig(
 *   await cardanVitestProjects({
 *     root: import.meta.dirname,
 *     shared: ['test/unit/**\/*.test.ts'],
 *     defineVitestProject,
 *   }),
 * );
 * ```
 */
export interface CardanVitestOptions {
  /** The project's root, with its package.json */
  root: string;
  /** The project's own setup files, after the layer's */
  setupFiles?: string[];
  /** `['test/**\/*.test.ts']` by default */
  include?: string[];
  exclude?: string[];
  globals?: boolean;
  /** Mocks nuxt-auth-sanctum's client for every test (test/api-setup.ts) */
  sanctumClient?: boolean;
  /** A console error or warning fails the test (test/console-setup.ts) */
  failOnConsole?: boolean;
  /** `vi.restoreAllMocks()` before each test, the first one included */
  restoreMocks?: boolean;
  /** Packages to inline besides the wrapped libraries (`server.deps.inline`) */
  inline?: (string | RegExp)[];
}

/** The libraries the layer's components wrap: from the checkout they load a second Vue */
const wrappedLibraries = [/@vueform\//, /@vuepic\//, /md-editor-v3/];

/** This checkout's `test/` */
const layerTest = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function cardanVitestConfig(options: CardanVitestOptions) {
  return {
    resolve: {
      alias: { '#layer-test': layerTest },
      dedupe: dependenciesOf(options.root),
    },
    test: {
      environment: 'nuxt',
      environmentOptions: {
        nuxt: { domEnvironment: 'happy-dom' as const },
      },
      // The console guard first, so its afterEach runs last
      setupFiles: [
        ...(options.failOnConsole ? [join(layerTest, 'console-setup.ts')] : []),
        ...(options.sanctumClient ? [join(layerTest, 'api-setup.ts')] : []),
        ...(options.setupFiles ?? []),
      ],
      include: options.include ?? ['test/**/*.test.ts'],
      ...(options.restoreMocks ? { restoreMocks: true } : {}),
      server: {
        deps: { inline: [...wrappedLibraries, ...(options.inline ?? [])] },
      },
      ...(options.exclude ? { exclude: options.exclude } : {}),
      ...(options.globals !== undefined ? { globals: options.globals } : {}),
    },
  };
}

/** Whether a test file mocks a module (`vi.mock`, `mockNuxtImport`, `mockComponent`) */
export function mocksModule(file: string) {
  return /\b(vi\.(do)?[mM]ock|mockNuxtImport|mockComponent)\(/.test(
    readFileSync(file, 'utf8'),
  );
}

export interface CardanVitestProjectsOptions<P> extends CardanVitestOptions {
  /** Globs, from `root`, of the files that share one app per worker */
  shared: string[];
  /** Globs of files among `shared` that keep an app of their own; a comment beside each gives why */
  isolated?: string[];
  /** The project's own `defineVitestProject` from `@nuxt/test-utils/config` */
  defineVitestProject(config: object): P;
}

export async function cardanVitestProjects<P>(
  options: CardanVitestProjectsOptions<P>,
) {
  const config = cardanVitestConfig(options);
  const shared = globSync(options.shared, {
    cwd: options.root,
    exclude: [...(config.test.exclude ?? []), ...(options.isolated ?? [])],
  }).filter((file) => !mocksModule(join(options.root, file)));

  return {
    test: {
      projects: [
        await options.defineVitestProject({
          ...config,
          test: {
            ...config.test,
            name: 'shared',
            include: shared,
            isolate: false,
          },
        }),
        await options.defineVitestProject({
          ...config,
          test: {
            ...config.test,
            name: 'isolated',
            // vitest's default, which an `exclude` replaces
            exclude: [
              ...(config.test.exclude ?? ['**/node_modules/**', '**/.git/**']),
              ...shared,
            ],
          },
        }),
      ],
    },
  };
}
