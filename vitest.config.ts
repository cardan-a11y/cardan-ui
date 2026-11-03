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
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
