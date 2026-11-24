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
    // test/api-setup.ts: nuxt-auth-sanctum's client is the API fake in every test
    setupFiles: ['./test/api-setup.ts', './test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
});
