import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useRouter } from '#imports';
import identityMiddleware from '../../auth/app/middleware/00.identity.global';
import { navigate, signIn, useScenario } from './fortify';
import { academy } from './scenarios';

mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

// `$identityReady` is provided once, at start-up: a test holds its own in place
const identity = vi.hoisted(() => ({
  ready: undefined as Promise<void> | undefined,
}));
mockNuxtImport('useNuxtApp', (original: () => object) => () => {
  const app = original();
  return identity.ready
    ? Object.create(app, { $identityReady: { value: identity.ready } })
    : app;
});

/** An identity request under way, until the test answers it */
function identityUnderWay() {
  let answer!: () => void;
  identity.ready = new Promise<void>((resolve) => (answer = resolve));
  onTestFinished(() => {
    answer();
    identity.ready = undefined;
  });
  return answer;
}

/** Whether `promise` settles within `ms`, page imports included */
function settlesWithin(promise: Promise<unknown>, ms = 500) {
  return Promise.race([
    promise.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

describe('identity middleware', () => {
  useScenario(academy);

  it('holds a navigation until the identity is known, so the next middleware decides on it', async () => {
    const answer = identityUnderWay();

    const navigation = useRouter().push('/forgot-password');
    expect(await settlesWithin(navigation)).toBe(false);
    expect(useRouter().currentRoute.value.path).toBe('/');

    // The identity arrives: an account that must set up MFA
    signIn(academy.user({ mfa_enabled: false, mfa_required: true }));
    answer();
    await navigation;

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/mfa-setup',
      query: { redirect: '/forgot-password' },
    });
  });

  it('lets a route with `waitForIdentity: false` through at once', async () => {
    identityUnderWay();

    // A playground documentation page, see .playground/nuxt.config.ts
    const navigation = useRouter().push('/accessibility');

    expect(await settlesWithin(navigation, 2_000)).toBe(true);
    expect(useRouter().currentRoute.value.path).toBe('/accessibility');
  });

  it('waits on its own, for a route without the flag', async () => {
    const answer = identityUnderWay();
    const to = useRouter().resolve('/forgot-password');

    const result = identityMiddleware(to, useRouter().currentRoute.value);
    expect(await settlesWithin(Promise.resolve(result))).toBe(false);

    answer();
    await expect(result).resolves.toBeUndefined();
  });
});
