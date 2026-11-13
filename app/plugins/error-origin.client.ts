/**
 * Marks a non-fatal error that page middleware raises during a navigation in
 * the browser with the address the app was on. A non-fatal error there stops
 * the navigation, so the address stays on the page with the link, and the
 * error page's way back is that page, not the one before it
 * (ErrorPageContent). A fatal one adds the refused address to the history
 * (Nuxt's router plugin), and back is the page with the link as usual.
 *
 * Only for a page the app has shown: on the first load of an `ssr: false`
 * app, middleware runs before any, and the router's route is its start
 * location, which matches nothing. It reads Nuxt's private
 * `_processingMiddleware` (Nuxt 4.6), set while middleware runs: without it,
 * in a later Nuxt, nothing is marked and the error page goes back in the
 * history or home, as for any other error.
 */
export default defineNuxtPlugin({
  name: 'cardan-ui:error-origin',
  setup(nuxtApp) {
    const router = useRouter();

    nuxtApp.hook('app:error', (error) => {
      const route = router.currentRoute.value;

      // A fatal error's address is in the history already
      if (!nuxtApp._processingMiddleware || error.fatal) return;
      if (!route.matched.length) return;

      Object.defineProperty(error, Symbol.for('cardan-ui:stopped-navigation'), {
        value: route.fullPath,
        configurable: true,
      });
    });
  },
});
