import {
  addPlugin,
  addRouteMiddleware,
  createResolver,
  defineNuxtModule,
} from 'nuxt/kit';

/**
 * Marks a non-fatal error that middleware raises during a navigation with the
 * address the app stayed on, the error page's way back (ErrorPageContent).
 */
export default defineNuxtModule({
  meta: { name: '@cardan/ui:error-origin' },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    // First of all global middleware, a project's and a module's included
    addRouteMiddleware(
      {
        name: 'cardan-ui-error-origin',
        path: resolve('./runtime/error-origin'),
        global: true,
      },
      { prepend: true },
    );
    addPlugin(resolve('./runtime/error-origin.client'));
  },
});
