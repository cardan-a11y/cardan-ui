import { defineNuxtPlugin, useRouter } from '#imports';
import { endMiddleware, inMiddleware } from './error-origin';

export default defineNuxtPlugin({
  name: 'cardan-ui:error-origin',
  setup(nuxtApp) {
    const router = useRouter();

    router.afterEach((to) => endMiddleware(to));
    router.onError((_error, to) => endMiddleware(to));

    nuxtApp.hook('app:error', (error) => {
      const route = router.currentRoute.value;

      if (!inMiddleware() || error.fatal) return;
      if (!route.matched.length) return;

      Object.defineProperty(error, Symbol.for('cardan-ui:stopped-navigation'), {
        value: route.fullPath,
        configurable: true,
      });
    });
  },
});
