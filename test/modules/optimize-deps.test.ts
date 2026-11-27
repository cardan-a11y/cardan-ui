import { describe, it, expect, afterAll } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import optimizeDeps, {
  LAYER_DEPENDENCIES,
  mergeInclude,
  projectDependencies,
} from '../../modules/optimize-deps';

/** Packages Vite needs no help with: Vue's and Nuxt's own, and aliases */
const ESM = /^(vue|vue-router|nuxt|@vueuse\/.*|#.*|~.*|@\/.*)$/;

function packageImports(source: string) {
  const ids = [
    ...source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm),
    ...source.matchAll(/^import\s+'([^']+)'/gm),
    // A package loaded on demand, such as FileInput's compressorjs
    ...source.matchAll(/\bimport\(\s*'([^']+)'\s*\)/g),
  ].map((match) => match[1]!);
  return ids.filter(
    (id) => !id.startsWith('.') && !id.endsWith('.css') && !ESM.test(id),
  );
}

function stub(root: string, name: string, pkg: object, files: string[]) {
  const dir = join(root, 'node_modules', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...pkg }));
  for (const file of files)
    writeFileSync(join(dir, file), 'module.exports = {};');
}

/**
 * The packages the layer adds to `vite.optimizeDeps.include`: those its
 * components import, and only those the project itself installs.
 */
describe('optimize-deps', () => {
  // A project outside the layer, as the siblings are: no node_modules above it
  const project = mkdtempSync(join(tmpdir(), 'cardan-ui-project-'));
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  it('lists the packages that the components import, and no other', () => {
    const imported = readdirSync('app', { recursive: true, encoding: 'utf8' })
      .filter((file) => /\.(vue|ts)$/.test(file))
      .flatMap((file) =>
        packageImports(readFileSync(join('app', file), 'utf8')),
      );
    expect([...new Set(imported)].sort()).toEqual(
      [...LAYER_DEPENDENCIES].sort(),
    );
  });

  it('adds a package only when it resolves from the project, not from the layer', async () => {
    // A subpath through `exports`, as `date-fns/locale` is
    stub(
      project,
      'date-fns',
      { exports: { '.': './index.js', './locale': './locale.js' } },
      ['index.js', 'locale.js'],
    );
    stub(project, 'compressorjs', { main: 'index.js' }, ['index.js']);

    expect(await projectDependencies(project)).toEqual([
      'date-fns',
      'date-fns/locale',
      'compressorjs',
    ]);
  });

  it('adds them all where everything is installed, as in the playground', async () => {
    expect(await projectDependencies('.playground')).toEqual(
      LAYER_DEPENDENCIES,
    );
  });

  it.each([
    ['development', true, ['diff', ...LAYER_DEPENDENCIES]],
    ['a build, prepare or test run', false, ['diff']],
  ])('adds them in development only: %s', async (_, dev, expected) => {
    const options = {
      dev,
      rootDir: '.playground',
      vite: { optimizeDeps: { include: ['diff'] } },
    };

    await optimizeDeps({}, { options } as never);

    expect(options.vite.optimizeDeps.include).toEqual(expected);
  });

  it("keeps the project's own entries, and lists a package once", () => {
    expect(
      mergeInclude(['diff', 'markdown-it'], ['markdown-it', 'compressorjs']),
    ).toEqual(['diff', 'markdown-it', 'compressorjs']);
    expect(mergeInclude(undefined, ['compressorjs'])).toEqual(['compressorjs']);
  });
});
