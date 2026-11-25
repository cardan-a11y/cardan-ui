import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSanctumClient } from '#imports';
import { api, client, requests, resetApi } from './api';
import { cardanPlaywrightConfig } from './config/playwright';
import { nuxtOptions } from './config/serve.mjs';
import { cardanVitestConfig } from './config/vitest';
import { readTripwire } from './tripwires';

/**
 * The shared test harness the projects use from this checkout: the config
 * functions in test/config/, the tripwire runner and the vitest API fake.
 * The Playwright API fake has its own spec, test/browser/api.spec.ts.
 */

const root = resolve(__dirname, '..');
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cardan-harness-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function writeJson(path: string, value: unknown) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

/** The modules a file imports, outside comments; `loaded` leaves out
 * `import type` and `export type`, which TypeScript erases */
function importsOf(source: string) {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const from = [
    ...code.matchAll(
      /^\s*(?:import|export)\s([^'";]*?)from\s+['"]([^'"]+)['"]/gm,
    ),
  ].map((match) => ({ id: match[2]!, type: /^type\s/.test(match[1]!) }));
  const others = [
    // `import 'x'`, for its side effects
    ...code.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
    ...code.matchAll(/\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => ({ id: match[1]!, type: false }));

  const all = [...from, ...others];
  return {
    all: all.map(({ id }) => id),
    loaded: all.filter(({ type }) => !type).map(({ id }) => id),
  };
}

describe('the config functions', () => {
  // A bare import would resolve from the checkout's node_modules, not the
  // project's: a project's tests would run on the checkout's copies, and
  // Playwright refuses a second copy of itself
  it.each([
    ...readdirSync(join(root, 'test/config')).map(
      (file) => `test/config/${file}`,
    ),
    'test/browser/api.ts',
    'test/browser/helpers.ts',
  ])('%s loads only node: modules and relative files', (file) => {
    const { all, loaded } = importsOf(readFileSync(join(root, file), 'utf8'));

    expect(all.length).toBeGreaterThan(0);
    expect(
      loaded.filter((id) => !id.startsWith('node:') && !id.startsWith('.')),
    ).toEqual([]);
  });

  it('the imports check finds every form of import', () => {
    const { all, loaded } = importsOf(`
      /** import { a } from 'in-a-docblock'; */
      // import { b } from 'in-a-comment';
      import type { Page } from 'type-only';
      import {
        c,
      } from 'multi-line';
      import 'side-effect';
      export { d } from 'export-from';
      export type { E } from 'export-type';
      const f = await import('dynamic');
      const g = require('required');
    `);

    expect(all).toEqual([
      'type-only',
      'multi-line',
      'export-from',
      'export-type',
      'side-effect',
      'dynamic',
      'required',
    ]);
    expect(loaded).toEqual([
      'multi-line',
      'export-from',
      'side-effect',
      'dynamic',
      'required',
    ]);
  });

  it('cardanVitestConfig dedupes every package of the project', () => {
    writeJson(join(dir, 'package.json'), {
      dependencies: { vue: '^3.5.0', 'nuxt-auth-sanctum': '^3.1.0' },
      devDependencies: { vitest: '^5.1.0', 'vitest-axe': '^0.1.0' },
    });

    const config = cardanVitestConfig({ root: dir });

    expect(config.resolve.dedupe).toEqual([
      'vue',
      'nuxt-auth-sanctum',
      'vitest',
      'vitest-axe',
    ]);
    expect(config.resolve.alias['#layer-test']).toBe(join(root, 'test'));
    expect(config.test.setupFiles).toEqual([]);
  });

  it("cardanVitestConfig lists the API fake's setup file before the project's", () => {
    writeJson(join(dir, 'package.json'), {});

    const config = cardanVitestConfig({
      root: dir,
      setupFiles: ['./test/setup.ts'],
      sanctumClient: true,
      globals: true,
    });

    expect(config.test.setupFiles).toEqual([
      join(root, 'test/api-setup.ts'),
      './test/setup.ts',
    ]);
    expect(config.test).toMatchObject({
      environment: 'nuxt',
      globals: true,
      include: ['test/**/*.test.ts'],
    });
  });

  it("serve's build goes to the project's cache, with its own overrides merged in", () => {
    writeJson(join(dir, 'package.json'), {
      dependencies: { vue: '^3.5.0' },
      devDependencies: { nuxt: '4.6.4' },
    });
    const cache = join(dir, 'node_modules/.cache/site-browser');

    const options = nuxtOptions(
      {
        root: dir,
        preset: 'node-server',
        dedupe: true,
        dotenv: false,
        overrides: ({ cache }: { cache: string }) => ({
          image: { provider: 'none' },
          nitro: { output: { publicDir: join(cache, 'public') } },
        }),
      },
      cache,
    );

    expect(options).toEqual({
      cwd: dir,
      dev: false,
      envName: 'test',
      dotenv: false,
      overrides: {
        buildDir: join(cache, '.nuxt'),
        nitro: {
          preset: 'node-server',
          output: {
            dir: join(cache, '.output'),
            publicDir: join(cache, 'public'),
          },
        },
        vite: {
          cacheDir: join(cache, 'vite'),
          resolve: { dedupe: ['vue', 'nuxt'] },
        },
        image: { provider: 'none' },
      },
    });
  });

  describe('cardanPlaywrightConfig', () => {
    const playwrightConfig = () =>
      cardanPlaywrightConfig({
        dir: join(dir, 'test/browser'),
        name: 'academy',
        port: 3016,
        locale: 'nl-NL',
        ready: '/cart',
      });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('runs serve.mjs beside the specs and waits for the ready path on the given port', () => {
      vi.stubEnv('PORT', undefined);
      const config = playwrightConfig();

      expect(config.use).toEqual({
        baseURL: 'http://localhost:3016',
        locale: 'nl-NL',
        trace: 'retain-on-failure',
      });
      expect(config.webServer).toMatchObject({
        command: 'node serve.mjs',
        cwd: join(dir, 'test/browser'),
        env: { PORT: '3016' },
        url: 'http://localhost:3016/cart',
      });
      expect(config.outputDir).toBe(
        join(dir, 'node_modules/.cache/academy-browser/results'),
      );
    });

    it('takes PORT from the environment, for the server too', () => {
      vi.stubEnv('PORT', '4010');
      const config = playwrightConfig();

      expect(config.use.baseURL).toBe('http://localhost:4010');
      expect(config.webServer).toMatchObject({
        env: { PORT: '4010' },
        url: 'http://localhost:4010/cart',
      });
    });

    it('forbids `.only` in CI, and reuses a server only with REUSE_SERVER', () => {
      vi.stubEnv('CI', undefined);
      vi.stubEnv('REUSE_SERVER', undefined);
      expect(playwrightConfig()).toMatchObject({
        forbidOnly: false,
        webServer: { reuseExistingServer: false },
      });

      vi.stubEnv('CI', 'true');
      vi.stubEnv('REUSE_SERVER', '1');
      expect(playwrightConfig()).toMatchObject({
        forbidOnly: true,
        webServer: { reuseExistingServer: true },
      });
    });
  });
});

describe('serve', () => {
  /** Runs serve() in a process of its own, with stand-ins for nuxt/kit and
   * the built server; each step writes what it sees to a log */
  function runServe(options: { args?: string[]; serverExit?: number } = {}) {
    const log = join(dir, 'log');
    const entry = join(
      dir,
      'node_modules/.cache/site-browser/.output/server/index.mjs',
    );
    const server = [
      "import { appendFileSync } from 'node:fs';",
      'const { SITE_URL, SERVER_ONLY, PORT, LOG, SERVER_EXIT } = process.env;',
      "appendFileSync(LOG, ['server', SITE_URL, SERVER_ONLY, PORT].join(' ') + '\\n');",
      'process.exit(Number(SERVER_EXIT));',
    ].join('\n');
    const script = join(dir, 'serve.mjs');
    writeFileSync(
      script,
      `
      import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
      import { dirname } from 'node:path';
      import { serve } from ${JSON.stringify(pathToFileURL(join(root, 'test/config/serve.mjs')).href)};

      const log = (...words) =>
        appendFileSync(process.env.LOG, words.join(' ') + '\\n');
      const entry = ${JSON.stringify(entry)};

      await serve({
        root: ${JSON.stringify(dir)},
        name: 'site',
        port: 4999,
        kit: async () => {
          log('kit', process.env.SITE_URL);
          return {
            loadNuxt: async () => {
              log('build', process.env.SITE_URL, process.env.SERVER_ONLY ?? '-');
              return { close: async () => {} };
            },
            buildNuxt: async () => {
              mkdirSync(dirname(entry), { recursive: true });
              writeFileSync(entry, ${JSON.stringify(server)});
            },
            writeTypes: async () => {},
          };
        },
        env: ({ origin }) => ({ SITE_URL: origin }),
        serverEnv: { SERVER_ONLY: 'yes' },
        onExit: () => log('onExit'),
      });
      `,
    );

    const { status, stderr } = spawnSync(
      process.execPath,
      [script, ...(options.args ?? [])],
      {
        // A hang fails the test rather than blocking the worker
        timeout: 30_000,
        env: {
          ...process.env,
          PORT: undefined,
          LOG: log,
          SERVER_EXIT: String(options.serverExit ?? 0),
        },
        encoding: 'utf8',
      },
    );
    return {
      status,
      stderr,
      log: existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [],
      built: existsSync(entry),
    };
  }

  it("sets `env` before it imports nuxt/kit, keeps `serverEnv` out of the build, and exits with the server's code after onExit", () => {
    const { status, log } = runServe({ serverExit: 3 });

    expect(log).toEqual([
      'kit http://localhost:4999',
      'build http://localhost:4999 -',
      'server http://localhost:4999 yes 4999',
      'onExit',
    ]);
    expect(status).toBe(3);
  });

  it('stops after the build with `--build-only`, and calls onExit', () => {
    const { status, log, built } = runServe({ args: ['--build-only'] });

    expect(log).toEqual([
      'kit http://localhost:4999',
      'build http://localhost:4999 -',
      'onExit',
    ]);
    expect(built).toBe(true);
    expect(status).toBe(0);
  });
});

describe('the tripwire runner', () => {
  const entry = {
    name: 'a workaround',
    package: 'some-lib',
    checked: '1.2',
    where: 'app/x.ts',
    check: 'whether it is fixed',
  };

  it('passes while the installed version is the checked major.minor', () => {
    writeJson(join(dir, 'node_modules/some-lib/package.json'), {
      version: '1.2.9',
    });
    const { found, expected } = readTripwire(dir, entry);
    expect(found).toBe(expected);
  });

  it("fails once the project's installed version leaves it, and says what to re-check", () => {
    writeJson(join(dir, 'node_modules/some-lib/package.json'), {
      version: '1.3.0',
    });
    const { found, expected, message } = readTripwire(dir, entry);
    expect(found).not.toBe(expected);
    expect(message).toBe(
      'some-lib is now 1.3.0: re-check app/x.ts (whether it is fixed), then remove the workaround or update this entry.',
    );
  });

  it('reads `checked` as the range a parent package declares', () => {
    writeJson(join(dir, 'node_modules/parent-lib/package.json'), {
      version: '7.0.0',
      dependencies: { 'some-lib': '^15.0.0' },
    });
    const { found, expected } = readTripwire(dir, {
      ...entry,
      parent: 'parent-lib',
      checked: '^14.0.0',
    });
    expect([found, expected]).toEqual(['^15.0.0', '^14.0.0']);
  });
});

// This file has no mockNuxtImport line of its own: test/api-setup.ts mocks
// the client for every test
describe('the vitest API fake', () => {
  it("is the app's Sanctum client, answering the routes a test names", async () => {
    api({ 'GET /api/things': ({ query }) => ({ data: [query] }) });

    expect(useSanctumClient()).toBe(client);
    await expect(
      useSanctumClient()('/api/things/', { query: { page: 2 } }),
    ).resolves.toEqual({ data: [{ page: 2 }] });
    expect(requests('GET /api/things')).toEqual([{ query: { page: 2 } }]);
    expect(requests()).toEqual(['GET /api/things']);
  });

  it('refuses a request to any other route and keeps it for the check after the test', async () => {
    api({});

    await expect(
      useSanctumClient()('/api/other', { method: 'post' }),
    ).rejects.toThrow('No route for POST /api/other');

    // What test/api-setup.ts finds after the test, and fails it on; taken
    // here so this test passes
    expect(resetApi()).toEqual(['POST /api/other']);
  });

  // Fails in test/api-setup.ts's afterEach, before `fails` applies; no
  // assertion of its own, which would count as the expected failure too
  it.fails('fails a test that leaves a request unanswered', async () => {
    api({});
    await useSanctumClient()('/api/other').catch(() => {});
  });

  it("answers the auth layer's identity request as a guest", async () => {
    await expect(useSanctumClient().raw('/api/user')).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
  });
});
