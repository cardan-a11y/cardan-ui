import type { RouteLocationNormalized } from 'vue-router';
import { describe, it, expect } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useAuth, useRouter, useRuntimeConfig } from '#imports';
import { navigate, signIn, useScenario } from './fortify';
import { academy } from './scenarios';

mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

/** Where a sign-in goes from a login page reached with this `?redirect=` */
async function targetFor(redirect: string | string[]) {
  await useRouter().push({ path: '/login', query: { redirect } });
  return useAuth().loginRedirectTarget();
}

/**
 * A security contract: a `?redirect=` counts only as a path of this app.
 * Under the Academy's config, whose `onLogin` is `/dashboard`.
 */
describe('useAuth: loginRedirectTarget', () => {
  useScenario(academy);

  it('keeps a path of the app, with its query and hash', async () => {
    expect(await targetFor('/courses/1?t=2#x')).toBe('/courses/1?t=2#x');
  });

  it.each([
    ['an absolute URL', 'https://evil.com'],
    ['a protocol-relative URL', '//evil.com'],
    ['a backslash the browser reads as a slash', '/\\evil.com'],
    ['a tab the browser drops', '/\t/evil.com'],
    ['a line break the browser drops', '/\n/evil.com'],
    ['a dot segment before two slashes', '/.//evil.com'],
    ['an encoded dot segment before two slashes', '/%2e//evil.com'],
    ['an encoded tab', '/%09/evil.com'],
    ['a malformed escape', '/%E0%A4%A'],
    ['a relative path', 'courses/1'],
    ['a script URL', 'javascript:alert(1)'],
  ])('falls back to onLogin for %s', async (_, redirect) => {
    expect(await targetFor(redirect)).toBe('/dashboard');
  });

  it('falls back to onLogin for a redirect given twice', async () => {
    expect(await targetFor(['/courses/1', '/courses/2'])).toBe('/dashboard');
  });

  it('ignores the redirect when the app does not keep the requested route', async () => {
    useRuntimeConfig().public.sanctum.redirect.keepRequestedRoute = false;
    expect(await targetFor('/courses/1')).toBe('/dashboard');
  });

  it('returns false when the app opted out of redirecting', async () => {
    const { redirect } = useRuntimeConfig().public.sanctum as {
      redirect: { onLogin: string | false };
    };
    redirect.onLogin = false;
    expect(await targetFor('https://evil.com')).toBe(false);
  });

  it('reads the route it is given, as route middleware passes it', async () => {
    await useRouter().push('/');
    const to = useRouter().resolve({
      path: '/mfa-setup',
      query: { redirect: '/courses/1' },
    }) as RouteLocationNormalized;
    expect(useAuth().loginRedirectTarget(to)).toBe('/courses/1');
  });
});

/** The avatar's initials, from the payload's `name` */
describe('useAuth: userInitials', () => {
  it.each([
    ['Jan van Dam', 'JD'],
    ['Maria de la Cruz', 'MC'],
    ['Ada', 'A'],
    ['  Ada   Lovelace ', 'AL'],
  ])('reads %j as %j', (name, initials) => {
    signIn({ name });
    expect(useAuth().userInitials.value).toBe(initials);
  });

  it('has none without a name', () => {
    signIn({ name: '  ' });
    expect(useAuth().userInitials.value).toBeUndefined();
  });
});
