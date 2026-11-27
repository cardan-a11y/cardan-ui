import { globSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { defineVitestProject } from '@nuxt/test-utils/config';
import { mocksModule } from './test/config/vitest.ts';

// Files that import nothing of Nuxt: happy-dom without the Nuxt environment
const plain = [
  'test/{a11y,i18n,icons,namespaces,projectTypes,templates,tokens}.test.ts',
  'test/claude-plugin/**/*.test.ts',
  'test/modules/optimize-deps.test.ts',
  'test/utils/{file,markdown,number,video}.test.ts',
  'test/auth/{qr,resolveLocale,layerConfig}.test.ts',
];

// One playground app per worker for these files (CLAUDE.md, Tests); a module
// mock would not reach a module the shared app has loaded already
const shared = globSync('test/{components,composables,utils}/**/*.test.ts', {
  exclude: plain,
}).filter((file) => !mocksModule(file));

// The console guard first, so its afterEach runs last
const consoleGuard = './test/console-setup.ts';

const nuxt = {
  environment: 'nuxt',
  environmentOptions: {
    nuxt: { rootDir: '.playground', domEnvironment: 'happy-dom' as const },
  },
  setupFiles: [consoleGuard, './test/api-setup.ts', './test/setup.ts'],
  // A spy a failed test left behind does not reach the next test
  restoreMocks: true,
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'plain',
          environment: 'happy-dom',
          include: plain,
          setupFiles: [consoleGuard],
          restoreMocks: true,
        },
      },
      await defineVitestProject({
        test: { ...nuxt, name: 'nuxt', include: shared, isolate: false },
      }),
      // A fresh app per file: module mocks, and the auth layer, plugins and
      // modules, which start it in a state of their own
      await defineVitestProject({
        test: {
          ...nuxt,
          name: 'nuxt-isolated',
          include: ['test/**/*.test.ts'],
          exclude: [...plain, ...shared, 'test/browser/**'],
        },
      }),
    ],
  },
});
