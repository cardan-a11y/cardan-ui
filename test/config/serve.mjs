/**
 * The browser suite's server: builds the app and serves it, as the web server
 * of a Playwright config (test/config/playwright.ts). The layer's
 * test/browser/serve.mjs and a project's use it:
 *
 * ```js
 * // test/browser/serve.mjs of a project
 * import { serve } from '../../../cardan-ui/test/config/serve.mjs';
 *
 * await serve({
 *   root: new URL('../..', import.meta.url),
 *   name: 'academy',
 *   port: 3016,
 *   kit: () => import('nuxt/kit'),
 *   preset: 'node-server',
 *   writeTypes: true,
 *   output: 'ACADEMY_OUTPUT',
 *   env: ({ origin, port }) => ({ NUXT_PUBLIC_SITE_URL: origin }),
 * });
 * ```
 *
 * Plain JavaScript, so `node serve.mjs` runs it without a type stripper; it
 * imports only Node built-ins. Every package comes from the project: `kit` is
 * the project's own `nuxt/kit`, imported only after `env` is set.
 *
 * The build goes to `node_modules/.cache/<name>-browser` of the project
 * (its own build, output and Vite cache folders), so it runs next to
 * `pnpm dev`. The server gets SIGINT and SIGTERM, and its exit code is the
 * script's: 128 + the signal's number after a signal, 1 after a failed build.
 * `--build-only` on the command line stops after the build.
 *
 * Options:
 * - `root`: the project's root, a path or a file URL.
 * - `name`: the cache folder's name, `<name>-browser`.
 * - `port`: the default port; `PORT` in the environment wins.
 * - `kit`: `() => import('nuxt/kit')`, the project's own.
 * - `cwd`: the Nuxt app to build, relative to `root` (default `root`; the
 *   layer builds `.playground`).
 * - `envName`: `test` by default, the `$test` block that extends
 *   ../cardan-ui; the layer builds with `production`.
 * - `env`: variables set on `process.env` before Nuxt reads the config, so
 *   an `.env` does not override them; an object or `({ origin, port }) =>`
 *   object, where a key set to `undefined` is left out. The server inherits them.
 * - `serverEnv`: variables for the server only, not the build; the same form.
 * - `dotenv`: `false` ignores `.env` altogether.
 * - `dedupe`: `true` resolves every package of the project's package.json
 *   from the project in the build (Vite's `dedupe`), not from the checkout.
 * - `preset`: Nitro's preset, such as `node-server`.
 * - `writeTypes`: writes the generated types before the build.
 * - `overrides`: the project's own Nuxt overrides, merged over the cache
 *   folders; an object or `({ cache }) =>` object.
 * - `output`: the name of a variable that, when set, names an existing Nitro
 *   output to serve instead of building (`PLAYGROUND_OUTPUT`).
 * - `onExit`: called once when the script ends, however it ends, to stop a
 *   process the project started first (the cms's Statamic stand-in).
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { constants } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `b` over `a`, plain objects merged key by key */
export function merge(a, b) {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b ?? {})) {
    merged[key] =
      isObject(value) && isObject(merged[key])
        ? merge(merged[key], value)
        : value;
  }
  return merged;
}

/** Every package in the project's package.json */
export function dependenciesOf(root) {
  const { dependencies = {}, devDependencies = {} } = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  );
  return [...Object.keys(dependencies), ...Object.keys(devDependencies)];
}

const pathOf = (path) =>
  path instanceof URL || String(path).startsWith('file:')
    ? fileURLToPath(path)
    : resolve(String(path));

const valueOf = (option, context) =>
  typeof option === 'function' ? option(context) : (option ?? {});

const withoutUndefined = (env) =>
  Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined),
  );

/** The exit code of a process a signal ended, as a shell reports it */
const signalCode = (signal) => 128 + (constants.signals[signal] ?? 0);

/** The options `loadNuxt()` gets; exported for its test */
export function nuxtOptions(options, cache) {
  const root = pathOf(options.root);
  const base = {
    buildDir: join(cache, '.nuxt'),
    nitro: {
      ...(options.preset ? { preset: options.preset } : {}),
      output: { dir: join(cache, '.output') },
    },
    vite: {
      cacheDir: join(cache, 'vite'),
      ...(options.dedupe ? { resolve: { dedupe: dependenciesOf(root) } } : {}),
    },
  };

  return {
    cwd: join(root, options.cwd ?? ''),
    dev: false,
    envName: options.envName ?? 'test',
    ...(options.dotenv === false ? { dotenv: false } : {}),
    overrides: merge(base, valueOf(options.overrides, { cache })),
  };
}

export async function serve(options) {
  const root = pathOf(options.root);
  const port = String(process.env.PORT ?? options.port);
  const origin = `http://localhost:${port}`;
  const cache = join(root, `node_modules/.cache/${options.name}-browser`);
  let exited = false;
  const onExit = () => {
    if (exited) return;
    exited = true;
    options.onExit?.();
  };
  const exit = (code) => {
    onExit();
    process.exit(code);
  };

  let server;
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      if (!server) return exit(signalCode(signal));
      onExit();
      server.kill(signal);
    });
  }

  Object.assign(
    process.env,
    withoutUndefined(valueOf(options.env, { origin, port })),
  );

  async function build() {
    const { loadNuxt, buildNuxt, writeTypes } = await options.kit();
    const nuxt = await loadNuxt(nuxtOptions(options, cache));

    if (options.writeTypes) await writeTypes(nuxt);
    await buildNuxt(nuxt);
    await nuxt.close();

    return join(cache, '.output');
  }

  const existing = options.output && process.env[options.output];
  let output;
  try {
    output = existing ? resolve(root, existing) : await build();
  } catch (error) {
    console.error(error);
    exit(1);
  }

  if (process.argv.includes('--build-only')) exit(0);

  const entry = join(output, 'server/index.mjs');
  if (!existsSync(entry)) {
    console.error(`No build at ${output}`);
    exit(1);
  }

  server = spawn(process.execPath, [entry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...valueOf(options.serverEnv, { origin, port }),
      PORT: port,
    },
  });
  server.on('exit', (code, signal) => exit(code ?? signalCode(signal)));
}
