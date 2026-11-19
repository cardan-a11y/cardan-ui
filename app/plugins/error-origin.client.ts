/**
 * Marks a non-fatal error that page middleware raises during a navigation with
 * the address the app stayed on, the error page's way back (ErrorPageContent).
 * Reads Nuxt 4.6's private `_processingMiddleware`; without it nothing is
 * marked. Tripwire: test/tripwires.test.ts.
 */
export default defineNuxtPlugin({
  name: 'cardan-ui:error-origin',
  setup(nuxtApp) {
    const router = useRouter();

    nuxtApp.hook('app:error', (error) => {
      const route = router.currentRoute.value;

      if (!nuxtApp._processingMiddleware || error.fatal) return;
      if (!route.matched.length) return;

      Object.defineProperty(error, Symbol.for('cardan-ui:stopped-navigation'), {
        value: route.fullPath,
        configurable: true,
      });
    });
  },
});
