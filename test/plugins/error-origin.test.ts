import { afterEach, describe, it, expect } from 'vitest';
import { START_LOCATION } from 'vue-router';

/**
 * The error-origin plugin marks a non-fatal error that middleware raises
 * with the page the app was on, for ErrorPageContent's way back (the browser
 * suite follows it in the playground).
 */
const key = Symbol.for('cardan-ui:stopped-navigation');

async function raise(options: { fatal?: boolean } = {}) {
  const error = createError({ status: 403, ...options });
  await useNuxtApp().callHook('app:error', error);
  return (error as unknown as Record<symbol, unknown>)[key];
}

describe('error-origin', () => {
  afterEach(() => {
    delete useNuxtApp()._processingMiddleware;
  });

  it('marks an error of middleware with the page the app shows', async () => {
    useNuxtApp()._processingMiddleware = true;

    expect(await raise()).toBe(useRouter().currentRoute.value.fullPath);
  });

  it('leaves a fatal error, an error outside middleware, and the first load of a client-only app alone', async () => {
    expect(await raise()).toBeUndefined();

    useNuxtApp()._processingMiddleware = true;
    expect(await raise({ fatal: true })).toBeUndefined();

    // Before the first page: the router is at its start, which matches
    // nothing, and back there would show an empty page
    const route = useRouter().currentRoute;
    const shown = route.value;
    route.value = START_LOCATION;
    try {
      expect(await raise()).toBeUndefined();
    } finally {
      route.value = shown;
    }
  });
});
