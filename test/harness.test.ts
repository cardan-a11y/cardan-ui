import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSanctumClient } from '#imports';
import { api, client, requests, resetApi } from './api';
import { cardanPlaywrightConfig } from './config/playwright';
import { nuxtOptions } from './config/serve.mjs';
import { cardanVitestConfig } from './config/vitest';
import { compareVersions, readTripwire } from './tripwires';

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

describe('the config functions', () => {
  // A bare import would resolve from the checkout's node_modules, not the
  // project's: a project's tests would run on the checkout's copies
  it.each(readdirSync(join(root, 'test/config')))(
    '%s imports only node: modules and relative files',
    (file) => {
      // Without comments: a docblock's example imports the project's packages
      const source = readFileSync(join(root, 'test/config', file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      const specifiers = [
        ...source.matchAll(
          /^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm,
        ),
        ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
      ].map((match) => match[1]!);

      expect(specifiers.length).toBeGreaterThan(0);
      expect(
        specifiers.filter((s) => !s.startsWith('node:') && !s.startsWith('.')),
      ).toEqual([]);
    },
  );

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

  it('cardanPlaywrightConfig waits for the ready path on the given port', () => {
    const port = process.env.PORT;
    delete process.env.PORT;
    try {
      const config = cardanPlaywrightConfig({
        dir: join(dir, 'test/browser'),
        name: 'academy',
        port: 3016,
        locale: 'nl-NL',
        ready: '/cart',
      });

      expect(config.use).toEqual({
        baseURL: 'http://localhost:3016',
        locale: 'nl-NL',
        trace: 'retain-on-failure',
      });
      expect(config.webServer.url).toBe('http://localhost:3016/cart');
      expect(config.outputDir).toBe(
        join(dir, 'node_modules/.cache/academy-browser/results'),
      );
    } finally {
      if (port !== undefined) process.env.PORT = port;
    }
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

  it('fails a release entry once the Cardan UI checkout reaches the release', () => {
    const layer = join(dir, 'cardan-ui');
    const release = {
      name: 'until 2.6.1',
      release: '2.6.1',
      where: 'app/y.ts',
      check: 'whether the layer fixed it',
    };

    writeJson(join(layer, 'package.json'), { version: '2.6.0' });
    expect(readTripwire(dir, release, layer).found).toBe('before');

    writeJson(join(layer, 'package.json'), { version: '2.6.1' });
    const reached = readTripwire(dir, release, layer);
    expect(reached.found).not.toBe(reached.expected);
    expect(reached.message).toMatch(/^Cardan UI is now 2\.6\.1/);
  });

  it('compares versions part by part', () => {
    expect(compareVersions('2.10.0', '2.9.9')).toBe(1);
    expect(compareVersions('2.6.0', '2.6.0')).toBe(0);
    expect(compareVersions('2.5.9', '2.6.0')).toBe(-1);
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

  it("answers the auth layer's identity request as a guest", async () => {
    await expect(useSanctumClient().raw('/api/user')).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
  });
});
