// @vitest-environment node
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadNuxt, writeTypes } from 'nuxt/kit';

// A project that extends the layer, with its own copy of @playwright/test. Not under node_modules: Playwright's loader
// reads tsconfig `paths` only for files outside it.
const root = resolve(__dirname, '..');
const project = resolve(root, '.cache/cardan-ui-types/project');
const projectPlaywright = join(project, 'node_modules/@playwright/test');
const layerPlaywright = realpathSync(join(root, 'node_modules/@playwright/test'));

function writeProject() {
  rmSync(project, { recursive: true, force: true });
  mkdirSync(projectPlaywright, { recursive: true });
  mkdirSync(join(project, 'test/browser'), { recursive: true });

  for (const file of ['package.json', 'index.js', 'index.mjs', 'index.d.ts']) {
    copyFileSync(join(layerPlaywright, file), join(projectPlaywright, file));
  }
  // The copy's own imports reach the same Playwright the runner below loads
  symlinkSync(
    join(dirname(dirname(layerPlaywright)), 'playwright'),
    join(project, 'node_modules/playwright'),
  );

  writeFileSync(
    join(project, 'package.json'),
    JSON.stringify({ name: 'project', type: 'module' }),
  );
  writeFileSync(
    join(project, 'nuxt.config.ts'),
    `export default { extends: [${JSON.stringify(root)}], compatibilityDate: '2026-04-03' };`,
  );
  // As Nuxt 4 projects have it: Playwright reads the references too
  writeFileSync(
    join(project, 'tsconfig.json'),
    JSON.stringify({
      files: [],
      references: ['app', 'server', 'shared', 'node'].map((name) => ({
        path: `./.nuxt/tsconfig.${name}.json`,
      })),
    }),
  );
  writeFileSync(
    join(project, 'test/browser/playwright.config.ts'),
    `import { defineConfig, devices } from '@playwright/test';\n` +
      `export default defineConfig({ testMatch: '*.pw.ts', projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }] });\n`,
  );
  writeFileSync(
    join(project, 'test/browser/loads.pw.ts'),
    `import { test } from '@playwright/test';\ntest('loads', () => {});\n`,
  );
}

beforeAll(async () => {
  writeProject();
  const nuxt = await loadNuxt({
    cwd: project,
    dev: false,
    overrides: { _prepare: true },
  });
  await writeTypes(nuxt);
  await nuxt.close();
}, 60_000);

afterAll(() => rmSync(resolve(project, '..'), { recursive: true, force: true }));

describe("a project's typecheck", () => {
  it("types the layer's browser helpers with the project's Playwright", () => {
    const config = ts.getParsedCommandLineOfConfigFile(
      join(project, '.nuxt/tsconfig.app.json'),
      {},
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} },
    )!;
    const helpers = ['helpers.ts', 'api.ts'].map((file) =>
      join(root, 'test/browser', file),
    );
    const program = ts.createProgram(helpers, config.options);
    const playwrightTypes = program
      .getSourceFiles()
      .map((file) => file.fileName)
      .filter((file) => file.endsWith('@playwright/test/index.d.ts'))
      .map((file) => realpathSync(file));

    expect(playwrightTypes).toEqual([
      realpathSync(join(projectPlaywright, 'index.d.ts')),
    ]);
  });
});

describe("a project's browser suite", () => {
  it('loads its Playwright config after the types are generated', () => {
    const output = execFileSync(
      process.execPath,
      [join(layerPlaywright, 'cli.js'), 'test', '-c', 'test/browser', '--list'],
      { cwd: project, encoding: 'utf8', stdio: 'pipe' },
    );

    expect(output).toContain('Total: 1 test in 1 file');
  });
});
