import { afterEach, describe, it, expect } from 'vitest';
import { START_LOCATION } from 'vue-router';
import type { RouteLocationNormalized } from 'vue-router';
import type { NuxtError } from '#app';
import middleware, {
  endMiddleware,
  inMiddleware,
} from '../../modules/runtime/error-origin';

/**
 * The error-origin module marks a non-fatal error that middleware raises
 * with the page the app was on, for ErrorPageContent's way back (the browser
 * suite follows it in the playground).
 */
const key = Symbol.for('cardan-ui:stopped-navigation');

/** The mark on the error that `act` raises */
async function markOf(act: () => unknown) {
  let raised: NuxtError | undefined;
  const off = useNuxtApp().hook('app:error', (error) => {
    raised = error;
  });
  try {
    await act();
  } catch {
    // A refused navigation rejects
  } finally {
    off();
  }
  expect(raised).toBeDefined();
  return (raised as unknown as Record<symbol, unknown>)[key];
}

describe('error-origin', () => {
  afterEach(() => {
    endMiddleware();
    clearError();
  });

  it('marks an error that page middleware raises with the page the app stays on', async () => {
    const router = useRouter();
    const shown = router.currentRoute.value.fullPath;

    expect(
      await markOf(() => router.push('/error-page/demo?refuse')),
    ).toBe(shown);
    expect(router.currentRoute.value.fullPath).toBe(shown);
  });

  it('leaves a fatal error of middleware alone', async () => {
    const router = useRouter();

    expect(
      await markOf(() => router.push('/error-page/demo?refuse=fatal')),
    ).toBeUndefined();
  });

  it('leaves an error after the navigation alone', async () => {
    const router = useRouter();
    await router.push('/error-page');

    expect(await markOf(() => showError({ status: 403 }))).toBeUndefined();
  });

  it('ends a navigation that middleware redirected', async () => {
    const router = useRouter();
    addRouteMiddleware(
      'test-redirect',
      (to) => {
        if ('redirect' in to.query) return navigateTo('/error-page');
      },
      { global: true },
    );

    await router.push('/form?redirect');
    expect(router.currentRoute.value.fullPath).toBe('/error-page');
    expect(inMiddleware()).toBe(false);
    expect(await markOf(() => showError({ status: 404 }))).toBeUndefined();
  });

  it('keeps a newer navigation in middleware when an older one it cancelled ends', async () => {
    const router = useRouter();
    const older = router.resolve('/error-page') as RouteLocationNormalized;
    const newer = router.resolve('/form') as RouteLocationNormalized;

    await middleware(older, START_LOCATION);
    await middleware(newer, START_LOCATION);
    endMiddleware(older);
    expect(inMiddleware()).toBe(true);

    endMiddleware(newer);
    expect(inMiddleware()).toBe(false);
  });

  it('leaves the first load of a client-only app alone', async () => {
    // Before the first page: the router is at its start, which matches
    // nothing, and back there would show an empty page
    const route = useRouter().currentRoute;
    const shown = route.value;
    route.value = START_LOCATION;
    try {
      await middleware(START_LOCATION, START_LOCATION);
      expect(await markOf(() => showError({ status: 403 }))).toBeUndefined();
    } finally {
      route.value = shown;
    }
  });
});
