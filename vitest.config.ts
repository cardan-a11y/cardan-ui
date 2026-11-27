import { defineVitestConfig } from '@nuxt/test-utils/config';

// The tests mount the components in the playground's Nuxt app, which
// extends the layer and the auth layer with the modules the components need.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        rootDir: '.playground',
        domEnvironment: 'happy-dom',
      },
    },
    // The console guard first, so its afterEach runs last
    setupFiles: [
      './test/console-setup.ts',
      './test/api-setup.ts',
      './test/setup.ts',
    ],
    // A spy a failed test left behind does not reach the next test
    restoreMocks: true,
    include: ['test/**/*.test.ts'],
  },
});
