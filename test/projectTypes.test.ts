// @vitest-environment node
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadNuxt, writeTypes } from 'nuxt/kit';

const root = resolve(__dirname, '..');
const project = resolve(root, 'node_modules/.cache/cardan-ui-types/project');
const projectPlaywright = join(project, 'node_modules/@playwright/test');

async function generatedAppTsConfig() {
  mkdirSync(projectPlaywright, { recursive: true });
  writeFileSync(
    join(project, 'nuxt.config.ts'),
    `export default { extends: [${JSON.stringify(root)}], compatibilityDate: '2026-04-03' };`,
  );
  writeFileSync(
    join(projectPlaywright, 'package.json'),
    JSON.stringify({
      name: '@playwright/test',
      version: '0.0.0-project',
      exports: { './package.json': './package.json' },
    }),
  );

  const nuxt = await loadNuxt({
    cwd: project,
    dev: false,
    overrides: { _prepare: true },
  });
  await writeTypes(nuxt);
  await nuxt.close();
  const typesDir = nuxt.options.typesDir || nuxt.options.buildDir;
  const file = join(typesDir, 'tsconfig.app.json');
  return {
    typesDir,
    paths: JSON.parse(readFileSync(file, 'utf8')).compilerOptions.paths as
      Record<string, string[]> | undefined,
  };
}

afterAll(() => rmSync(project, { recursive: true, force: true }));

describe("a project's typecheck", { timeout: 60_000 }, () => {
  it("types the layer's browser helpers with the project's Playwright", async () => {
    const { typesDir, paths } = await generatedAppTsConfig();
    const mapped = paths?.['@playwright/test']?.[0];

    expect(mapped).toBeDefined();
    expect(realpathSync(resolve(typesDir, mapped!))).toBe(
      realpathSync(projectPlaywright),
    );
  });
});
