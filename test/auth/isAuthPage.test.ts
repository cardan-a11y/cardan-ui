import { describe, it, expect } from 'vitest';
import { computed, effectScope, ref } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { AUTH_PAGES, isAuthPage, useAppConfig } from '#imports';
import { client, navigate, useScenario } from './fortify';
import { academy, auditor } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

describe('isAuthPage() (Auditor)', () => {
  useScenario(auditor);

  it.each(AUTH_PAGES)('knows %s, with and without a query', (path) => {
    expect(isAuthPage(path)).toBe(true);
    expect(isAuthPage(`${path}?redirect=%2Faudits`)).toBe(true);
    expect(isAuthPage(`${path}#main`)).toBe(true);
  });

  it("lists the layer's five sign-in pages", () => {
    expect(AUTH_PAGES).toEqual([
      '/login',
      '/forgot-password',
      '/reset-password',
      '/two-factor-authentication',
      '/mfa-setup',
    ]);
  });

  it('ignores a trailing slash, as nuxt-auth-sanctum does', () => {
    expect(isAuthPage('/login/')).toBe(true);
    expect(isAuthPage('/login/?redirect=%2F')).toBe(true);
  });

  it.each([
    '/',
    '/audits',
    '/login-help',
    '/loginx',
    '/settings/login',
    '/invitations/abc',
  ])('leaves %s out', (path) => {
    expect(isAuthPage(path)).toBe(false);
  });

  it('works in a computed read outside a component', () => {
    const scope = effectScope();
    const path = ref('/audits');
    const signInPage = scope.run(() => computed(() => isAuthPage(path.value)))!;

    expect(signInPage.value).toBe(false);
    path.value = '/login';
    expect(signInPage.value).toBe(true);
    scope.stop();
  });
});

describe('isAuthPage() (Academy)', () => {
  useScenario(academy);

  it('knows a prefix the app added, and everything below it', () => {
    expect(isAuthPage('/invitations/abc')).toBe(true);
    expect(isAuthPage('/invitations/abc?locale=en')).toBe(true);
    expect(isAuthPage('/invitations')).toBe(false);
  });

  it('knows an exact path the app added, and nothing below it', () => {
    (useAppConfig().cardanAuth as CardanAuthConfig).authPages.push('/welcome');

    expect(isAuthPage('/welcome')).toBe(true);
    expect(isAuthPage('/welcome?step=2')).toBe(true);
    expect(isAuthPage('/welcome/team')).toBe(false);
  });
});
