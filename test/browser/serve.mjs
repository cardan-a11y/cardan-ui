/**
 * Builds the playground and serves it for the browser suite: the web server
 * of playwright.config.ts.
 *
 * The build goes to node_modules/.cache/cardan-ui-browser, not to
 * .playground/.nuxt and .playground/.output, so it runs next to `pnpm dev`.
 * With PLAYGROUND_OUTPUT set to an existing Nitro output (CI sets
 * `.playground/.output`, which its build step made) it serves that instead.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = process.env.PORT ?? '3013';

async function build() {
  const cache = join(root, 'node_modules/.cache/cardan-ui-browser');
  const { loadNuxt, buildNuxt, writeTypes } = await import('nuxt/kit');

  const nuxt = await loadNuxt({
    cwd: join(root, '.playground'),
    dev: false,
    overrides: {
      buildDir: join(cache, '.nuxt'),
      nitro: { output: { dir: join(cache, '.output') } },
      vite: { cacheDir: join(cache, 'vite') },
    },
  });

  await writeTypes(nuxt);
  await buildNuxt(nuxt);
  await nuxt.close();

  return join(cache, '.output');
}

const output = process.env.PLAYGROUND_OUTPUT
  ? resolve(root, process.env.PLAYGROUND_OUTPUT)
  : await build();

const entry = join(output, 'server/index.mjs');
if (!existsSync(entry)) {
  console.error(`No playground build at ${output}`);
  process.exit(1);
}

const server = spawn(process.execPath, [entry], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    // The Auth UI pages talk to the mock endpoints of this server
    NUXT_PUBLIC_SANCTUM_BASE_URL: `http://localhost:${port}`,
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code) => process.exit(code ?? 0));
