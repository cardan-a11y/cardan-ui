import { afterEach, vi } from 'vitest';
import { disableAutoUnmount, enableAutoUnmount } from '@vue/test-utils';
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import { useNuxtApp } from '#imports';

// A failed test must not leave its component for the next test's axe run; test-utils
// stays loaded across files without isolation and allows one enableAutoUnmount()
disableAutoUnmount();
enableAutoUnmount(afterEach);

// A test that faked the clock and failed does not leave it faked
afterEach(() => {
  vi.useRealTimers();
});

// Each test starts in the app's default language, also after a switch
if (typeof window !== 'undefined') {
  afterEach(async () => {
    const { defaultLocale, locale, setLocale } = useNuxtApp().$i18n;
    if (defaultLocale && locale.value !== defaultLocale)
      await setLocale(defaultLocale);
  });
}

// The auth layer's identity request at start-up, to the playground's
// `sanctum.baseUrl`: a guest, whether or not a dev server listens there
if (typeof window !== 'undefined') {
  registerEndpoint(
    'http://localhost:3003/api/user',
    () => new Response('{"message":"Unauthenticated."}', { status: 401 }),
  );
}
