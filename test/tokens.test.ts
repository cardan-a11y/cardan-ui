import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { checkTokens, describeMissing, reachableFiles } from './tokens';

const root = resolve(__dirname, '..');
const layer = join(root, 'app');
const authLayer = join(root, 'auth');

describe('the main.css template', () => {
  it('declares every token the layer and the auth layer read without a fallback', () => {
    const result = checkTokens({
      mainCss: join(layer, 'assets/main.css'),
      sources: [layer, authLayer],
    });

    expect(describeMissing(result, root)).toBe('');
  });
});

/**
 * The projects that extend the layer, as scenarios of their own main.css,
 * when they are checked out next to this repository (not in CI). Each one is
 * checked against the layers it extends: the auth layer only where its
 * nuxt.config names it.
 *
 * `allow` lists the tokens a project lacks on purpose. They are forgiven only
 * in layer files the project cannot reach: a layer component its own files
 * use by name, or one such a component uses in turn, counts as reachable,
 * whatever props it is given; every composable, util, plugin and page of the
 * layer counts too.
 */
const projects: { name: string; allow: string[] }[] = [
  { name: 'cardan-academy-nuxt', allow: [] },
  { name: 'cardan-auditor-nuxt', allow: [] },
  {
    name: 'cardan-cms-nuxt',
    // Until its rebrand the cms keeps its own palette and scale, without
    // these tokens of the template
    allow: [
      '--cardan-*',
      '--color-secondary',
      '--color-secondary-hover',
      '--gradient-bg',
      '--hsl-app-nav',
      '--line-height-ui',
    ],
  },
  { name: 'cardan-support-nuxt', allow: [] },
];

describe.each(projects)('$name', ({ name, allow }) => {
  const project = resolve(root, '..', name);
  const mainCss = join(project, 'app/assets/main.css');
  const checkedOut = existsSync(mainCss);

  const sources = () =>
    readFileSync(join(project, 'nuxt.config.ts'), 'utf8').includes(
      'cardan-ui/auth',
    )
      ? [layer, authLayer]
      : [layer];

  describe.skipIf(!checkedOut)('main.css', () => {
    it('declares every token the layer reads, apart from the ones it lacks on purpose', () => {
      const result = checkTokens({ mainCss, sources: sources(), allow });

      expect(describeMissing(result, root)).toBe('');
      // A token it declares after all comes off the list
      expect(result.needlessAllow).toEqual([]);
    });

    if (!allow.length) return;

    it('declares the tokens it lacks wherever a component it reaches reads them', () => {
      const result = checkTokens({
        mainCss,
        sources: sources(),
        allow,
        reachable: reachableFiles(join(project, 'app'), sources()),
      });

      expect(describeMissing(result, root)).toBe('');
    });
  });
});
