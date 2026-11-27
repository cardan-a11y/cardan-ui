import { spawn } from 'node:child_process';
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
import { useSanctumClient, useSanctumUser } from '#imports';
import { defineComponent } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { api, client, requests, resetApi } from './api';
import { cardanPlaywrightConfig } from './config/playwright';
import { nuxtOptions } from './config/serve.mjs';
import { cardanVitestConfig } from './config/vitest';
import { expectConsole, installConsoleGuard, resetConsole } from './console';
import { fetchError } from './fetch';
import { loadIdentity } from './identity';
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

  it('cardanVitestConfig inlines the wrapped libraries, and the ones a project adds', () => {
    writeJson(join(dir, 'package.json'), {});

    const inline = (options = {}) =>
      cardanVitestConfig({ root: dir, ...options }).test.server.deps.inline;
    const wrapped = [
      '@vueform/multiselect',
      '@vuepic/vue-datepicker',
      'md-editor-v3',
    ];

    for (const id of wrapped) {
      expect(inline().some((pattern) => new RegExp(pattern).test(id))).toBe(
        true,
      );
    }
    expect(inline({ inline: [/@tiptap\//] })).toContainEqual(/@tiptap\//);
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
    expect(config.test).not.toHaveProperty('restoreMocks');
  });

  it('cardanVitestConfig lists the console guard first and restores spies, when the project asks for them', () => {
    writeJson(join(dir, 'package.json'), {});

    const config = cardanVitestConfig({
      root: dir,
      setupFiles: ['./test/setup.ts'],
      sanctumClient: true,
      failOnConsole: true,
      restoreMocks: true,
    });

    expect(config.test.setupFiles).toEqual([
      join(root, 'test/console-setup.ts'),
      join(root, 'test/api-setup.ts'),
      './test/setup.ts',
    ]);
    expect(config.test.restoreMocks).toBe(true);
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

describe('serve', { timeout: 30_000 }, () => {
  type Run = {
    args?: string[];
    build?: 'ok' | 'fail' | 'hang';
    server?: number | 'stay';
    /** Sends the signal once the log's last line starts with `after` */
    stop?: { after: string; signal: NodeJS.Signals };
  };

  /** Runs serve() in a process of its own, with stand-ins for nuxt/kit and
   * the built server; each step writes what it sees to a log */
  async function runServe(options: Run = {}) {
    const log = join(dir, 'log');
    const entry = join(
      dir,
      'node_modules/.cache/site-browser/.output/server/index.mjs',
    );
    const server = [
      "import { appendFileSync } from 'node:fs';",
      'const { SITE_URL, SERVER_ONLY, PORT, LOG, SERVER } = process.env;',
      "appendFileSync(LOG, ['server', SITE_URL, SERVER_ONLY, PORT].join(' ') + '\\n');",
      "if (SERVER === 'stay') setInterval(() => {}, 1000);",
      'else process.exit(Number(SERVER));',
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
          log('kit', process.env.SITE_URL, 'SITE_NOTHING' in process.env);
          return {
            loadNuxt: async () => {
              log('build', process.env.SITE_URL, process.env.SERVER_ONLY ?? '-');
              if (process.env.BUILD === 'fail') throw new Error('Broken config');
              if (process.env.BUILD === 'hang') {
                await new Promise(() => setInterval(() => {}, 1000));
              }
              return { close: async () => {} };
            },
            buildNuxt: async () => {
              mkdirSync(dirname(entry), { recursive: true });
              writeFileSync(entry, ${JSON.stringify(server)});
            },
            writeTypes: async () => {},
          };
        },
        env: ({ origin }) => ({ SITE_URL: origin, SITE_NOTHING: undefined }),
        serverEnv: { SERVER_ONLY: 'yes' },
        onExit: () => log('onExit'),
      });
      `,
    );

    const child = spawn(process.execPath, [script, ...(options.args ?? [])], {
      env: {
        ...process.env,
        PORT: undefined,
        LOG: log,
        BUILD: options.build ?? 'ok',
        SERVER: String(options.server ?? 0),
      },
      stdio: 'ignore',
    });
    const exited = new Promise<number | null>((resolve) =>
      child.on('exit', (code) => resolve(code)),
    );
    const lines = () =>
      existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];

    try {
      const { stop } = options;
      if (stop) {
        await vi.waitFor(
          () => expect(lines().at(-1)).toMatch(new RegExp(`^${stop.after}`)),
          { timeout: 10_000 },
        );
        child.kill(stop.signal);
      }
      return { status: await exited, log: lines(), built: existsSync(entry) };
    } finally {
      child.kill('SIGKILL');
    }
  }

  const start = [
    'kit http://localhost:4999 false',
    'build http://localhost:4999 -',
  ];

  it("sets `env` before it imports nuxt/kit, keeps `serverEnv` out of the build, and exits with the server's code after onExit", async () => {
    const { status, log } = await runServe({ server: 3 });

    expect(log).toEqual([
      ...start,
      'server http://localhost:4999 yes 4999',
      'onExit',
    ]);
    expect(status).toBe(3);
  });

  it('stops after the build with `--build-only`, and calls onExit', async () => {
    const { status, log, built } = await runServe({ args: ['--build-only'] });

    expect(log).toEqual([...start, 'onExit']);
    expect(built).toBe(true);
    expect(status).toBe(0);
  });

  it('calls onExit and exits 1 when the build fails', async () => {
    const { status, log, built } = await runServe({ build: 'fail' });

    expect(log).toEqual([...start, 'onExit']);
    expect(built).toBe(false);
    expect(status).toBe(1);
  });

  it('calls onExit when stopped during the build, and exits 128 + the signal', async () => {
    const { status, log } = await runServe({
      build: 'hang',
      stop: { after: 'build', signal: 'SIGINT' },
    });

    expect(log).toEqual([...start, 'onExit']);
    expect(status).toBe(130);
  });

  it('stops the server on a signal, calls onExit once, and exits 128 + the signal', async () => {
    const { status, log } = await runServe({
      server: 'stay',
      stop: { after: 'server', signal: 'SIGTERM' },
    });

    expect(log).toEqual([
      ...start,
      'server http://localhost:4999 yes 4999',
      'onExit',
    ]);
    expect(status).toBe(143);
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

  it('says what to re-check when the package is not installed', () => {
    const { found, expected, message } = readTripwire(dir, entry);
    expect(found).not.toBe(expected);
    expect(message).toBe(
      'some-lib is not installed: re-check app/x.ts (whether it is fixed), then remove the workaround or update this entry.',
    );
  });

  it('says what to re-check when the parent no longer depends on the package, or is not installed', () => {
    const withParent = { ...entry, parent: 'parent-lib', checked: '^14.0.0' };
    expect(readTripwire(dir, withParent).message).toMatch(
      /^parent-lib is not installed: re-check app\/x\.ts/,
    );

    writeJson(join(dir, 'node_modules/parent-lib/package.json'), {
      version: '8.0.0',
      dependencies: {},
    });
    const { found, expected, message } = readTripwire(dir, withParent);
    expect(found).not.toBe(expected);
    expect(message).toMatch(
      /^some-lib is no longer a dependency of parent-lib: re-check app\/x\.ts/,
    );
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

  it('answers the same routes through `client.raw`, as a response', async () => {
    api({
      'GET /api/user': () => ({ data: { id: 1 } }),
      'GET /api/invitations/7': () => {
        throw fetchError(410, { message: 'Expired' });
      },
    });
    const { raw } = useSanctumClient();

    await expect(raw('/api/user')).resolves.toEqual({
      ok: true,
      status: 200,
      _data: { data: { id: 1 } },
    });
    await expect(
      raw('/api/invitations/7', { ignoreResponseError: true }),
    ).resolves.toEqual({
      ok: false,
      status: 410,
      _data: { message: 'Expired' },
    });
    await expect(raw('/api/invitations/7')).rejects.toMatchObject({
      status: 410,
    });
    expect(requests()).toEqual([
      'GET /api/user',
      'GET /api/invitations/7',
      'GET /api/invitations/7',
    ]);
  });

  it('refuses `client.raw` to any other address than the identity request', async () => {
    await expect(
      useSanctumClient().raw('/api/invitations/7', {
        ignoreResponseError: true,
      }),
    ).rejects.toThrow('No route for GET /api/invitations/7');

    expect(resetApi()).toEqual(['GET /api/invitations/7']);
  });

  it('refuses a route key no request can match', () => {
    for (const key of ['get /api/user', 'GET /api/user/', 'GET', 'GET  /api']) {
      expect(() => api({ [key]: () => ({}) }), key).toThrow(
        `Route "${key}" never matches`,
      );
    }
  });

  it('takes the address as the app passes it, a query included', async () => {
    api({
      'GET /': () => 'home',
      'GET /api/audits?page=2': () => 'page 2',
    });

    await expect(useSanctumClient()('/')).resolves.toBe('home');
    await expect(useSanctumClient()('/api/audits?page=2')).resolves.toBe(
      'page 2',
    );
  });

  it("loads the identity through `client.raw`, as the auth layer's plugin does", async () => {
    const user = useSanctumUser();
    user.value = null;
    api({ 'GET /api/user': () => ({ data: { id: 1 } }) });

    try {
      await loadIdentity();

      expect(user.value).toEqual({ data: { id: 1 } });
      expect(requests()).toEqual(['GET /api/user']);
    } finally {
      user.value = null;
    }
  });
});

// test/console-setup.ts guards every test of the layer
describe('the vitest console guard', () => {
  // Fails in test/console-setup.ts's afterEach, before `fails` applies
  it.fails('fails a test that writes to console.error', () => {
    console.error('Something broke');
  });

  it.fails('fails a test that warns', () => {
    console.warn('Something is off');
  });

  it.fails('fails a test in which Vue warns', async () => {
    const NeedsLabel = defineComponent({
      props: { label: { type: String, required: true } },
      render: () => null,
    });
    await mountSuspended(NeedsLabel);
  });

  it('lets a test name the message it expects, and keeps it off the output', () => {
    expectConsole('warn', /has create-option and server-search/);
    console.warn('[ComboBox] "Topping" has create-option and server-search');
  });

  it.fails('fails a test whose expected message never came', () => {
    expectConsole('error', /Something broke/);
  });

  it.fails('fails on a message other than the one named', () => {
    expectConsole('warn', /Something is off/);
    console.warn('Something else');
  });

  it("leaves a method the test spied on itself to the test's own assertions", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    console.warn('Something is off');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('refuses expectConsole() where no guard is installed', () => {
    expect(resetConsole()).toEqual([]);
    expect(() => expectConsole('warn', /x/)).toThrow('needs the console guard');
    // For test/console-setup.ts's afterEach
    installConsoleGuard();
  });
});
