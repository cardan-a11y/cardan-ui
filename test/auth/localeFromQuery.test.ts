import { describe, it, expect, beforeEach } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useNuxtApp, useRouter } from '#imports';
import localeFromQuery from '../../auth/app/middleware/locale-from-query.global';
import { client, navigate, signIn, useScenario } from './fortify';
import { academy } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

/** Runs the middleware for a navigation to `path`, and returns the language */
async function visit(path: string) {
  const to = useRouter().resolve(path);
  await localeFromQuery(to, useRouter().currentRoute.value);
  return useNuxtApp().$i18n.locale.value;
}

describe('locale-from-query middleware', () => {
  useScenario(academy);

  beforeEach(async () => {
    await useNuxtApp().$i18n.setLocale('en');
  });

  it.each([
    '/reset-password?token=abc&email=a%40b.nl&locale=nl',
    '/login?locale=nl',
    '/forgot-password?locale=nl',
    '/two-factor-authentication?locale=nl',
  ])('shows %s in the language it asks for', async (path) => {
    expect(await visit(path)).toBe('nl');
  });

  it('runs on every navigation, as a global middleware', async () => {
    await useRouter().push('/forgot-password?locale=nl');
    expect(useNuxtApp().$i18n.locale.value).toBe('nl');
  });

  it('ignores a language the app does not offer', async () => {
    expect(await visit('/login?locale=de')).toBe('en');
  });

  it('leaves the other pages alone', async () => {
    expect(await visit('/accessibility?locale=nl')).toBe('en');
  });

  it('leaves a signed-in user in their own language', async () => {
    signIn(academy.user({}));
    expect(await visit('/reset-password?locale=nl')).toBe('en');
  });
});
