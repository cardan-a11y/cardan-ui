/**
 * `pnpm run typecheck`: vue-tsc over the playground twice, as the projects see
 * the layer. Once with typed routes (compatibilityVersion 5, the playground's),
 * once without (a project on 4: the `untyped-routes` env of
 * .playground/nuxt.config.ts), where vue-router's route types are the plain
 * generics: code that fits one can fail the other.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const untyped = join(root, '.playground/.nuxt-untyped-routes');

function run(command, args) {
  const { status, error } = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (error) console.error(error.message);
  return status === 0;
}

const prepared = run('nuxt', [
  'prepare',
  '.playground',
  '--envName',
  'untyped-routes',
]);

// The layer's tests are no project's: the typed run checks them
const app = join(untyped, 'tsconfig.app.json');
const { config, error } = ts.readConfigFile(app, ts.sys.readFile);
if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText));
const untypedConfig = join(untyped, 'tsconfig.untyped-routes.json');
writeFileSync(
  untypedConfig,
  JSON.stringify({
    extends: './tsconfig.app.json',
    exclude: [...(config.exclude ?? []), join(root, 'test/**/*')],
  }),
);

let passed = prepared;
for (const [name, tsconfig] of [
  ['typed routes', join(root, '.playground/.nuxt/tsconfig.app.json')],
  ['untyped routes', untypedConfig],
]) {
  console.log(`\n▶ vue-tsc, ${name}`);
  if (!run('vue-tsc', ['--noEmit', '-p', tsconfig])) passed = false;
}
process.exit(passed ? 0 : 1);
