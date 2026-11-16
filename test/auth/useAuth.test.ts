import { describe, it, expect } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useAuth, useRouter, useRuntimeConfig } from '#imports';
import { client, navigate, useScenario } from './fortify';
import { academy } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
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
 * `loginRedirectTarget()` decides where a sign-in lands: a security contract.
 * A `?redirect=` only counts when the browser would read it as a path of
 * this app; anything else (another site, however disguised) falls back to
 * `redirect.onLogin`. Under the Academy's redirect config, whose `onLogin`
 * is `/dashboard`.
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
    });
    expect(useAuth().loginRedirectTarget(to)).toBe('/courses/1');
  });
});
