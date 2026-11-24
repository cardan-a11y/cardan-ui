import { join, resolve } from 'node:path';

/**
 * The browser suite's Playwright config, as the layer and the projects share
 * it. It imports only Node built-ins: the project passes the result to its own
 * `defineConfig` and spreads its own `devices`, so Playwright is the
 * project's, never the checkout's:
 *
 * ```ts
 * // test/browser/playwright.config.ts of a project
 * import { defineConfig, devices } from '@playwright/test';
 * import { cardanPlaywrightConfig } from '../../../cardan-ui/test/config/playwright';
 *
 * const config = cardanPlaywrightConfig({
 *   dir: import.meta.dirname, name: 'academy', port: 3016, locale: 'nl-NL', ready: '/cart',
 * });
 * export default defineConfig({
 *   ...config,
 *   use: { ...devices['Desktop Chrome'], ...config.use },
 * });
 * ```
 *
 * Ports in use: layer 3013, Auditor 3014, support 3015, Academy 3016, cms 3017.
 * `PORT` in the environment wins; `REUSE_SERVER` uses a server you started
 * yourself on the port (`node test/browser/serve.mjs`).
 */
export interface CardanPlaywrightOptions {
  /** The folder of the config and the specs, with serve.mjs beside them */
  dir: string;
  /** The cache folder's name, as given to serve(): `<name>-browser` */
  name: string;
  port: number;
  /** The browser's locale, such as `en-GB` */
  locale: string;
  /** The path that answers once the server is ready, `/` by default */
  ready?: string;
  /** The project's root, from which `node_modules/.cache` is found; `dir`'s parent's parent by default */
  root?: string;
}

export function cardanPlaywrightConfig(options: CardanPlaywrightOptions) {
  const port = Number(process.env.PORT ?? options.port);
  const cache = resolve(
    options.root ?? join(options.dir, '../..'),
    `node_modules/.cache/${options.name}-browser`,
  );
  const origin = `http://localhost:${port}`;

  return {
    testDir: options.dir,
    testMatch: '*.spec.ts',
    outputDir: join(cache, 'results'),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI
      ? ([['list'], ['github']] as [string][])
      : ('list' as const),
    timeout: 60_000,
    use: {
      baseURL: origin,
      locale: options.locale,
      trace: 'retain-on-failure' as const,
    },
    projects: [{ name: 'chromium' }],
    webServer: {
      command: 'node serve.mjs',
      cwd: options.dir,
      env: { PORT: String(port) },
      url: `${origin}${options.ready ?? ''}`,
      timeout: 600_000,
      reuseExistingServer: !!process.env.REUSE_SERVER,
      stdout: 'ignore' as const,
      stderr: 'pipe' as const,
    },
  };
}
