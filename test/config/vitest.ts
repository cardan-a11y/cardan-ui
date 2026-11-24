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
 * - **`#layer-test`**: set here for vitest, to this checkout's `test/`. For
 *   `pnpm run typecheck` the project adds the tsconfig path in its
 *   `$development` block (`typescript.tsConfig.compilerOptions.paths`), never
 *   in the production config.
 * - **sanctumClient**: lists test/api-setup.ts, which mocks nuxt-auth-sanctum's
 *   client for every test with the API fake of test/api.ts.
 *
 * The layer's own vitest.config.ts does not use it: the layer is the checkout
 * and needs no dedupe.
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
}

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
      setupFiles: [
        ...(options.sanctumClient ? [join(layerTest, 'api-setup.ts')] : []),
        ...(options.setupFiles ?? []),
      ],
      include: options.include ?? ['test/**/*.test.ts'],
      ...(options.exclude ? { exclude: options.exclude } : {}),
      ...(options.globals !== undefined ? { globals: options.globals } : {}),
    },
  };
}
