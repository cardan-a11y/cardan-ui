import type { RouteLocationNormalized } from 'vue-router';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  onTestFinished,
  vi,
} from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import {
  useAppConfig,
  useColorMode,
  useNuxtApp,
  useProfileLocale,
  useRouter,
  useSanctumAuth,
} from '#imports';
import localeMiddleware from '../../auth/app/middleware/01.locale.global';
import { expectConsole } from '../console';
import { navigate, signIn, useScenario } from './fortify';
import { academy, auditor } from './scenarios';

mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const Page = defineComponent({ render: () => null });

/** Routes of an app: two with their own language (the Academy's catalog), one without */
const ROUTES = [
  { name: 'test-en-catalog', path: '/en/catalog', meta: { locale: 'en' } },
  { name: 'test-catalog', path: '/catalog', meta: { locale: 'nl' } },
  { name: 'test-dashboard', path: '/dashboard', meta: {} },
  { name: 'test-profile', path: '/profile', meta: {} },
  // An app's own sign-in page; the middleware knows it by its path
  { name: 'test-invitation', path: '/invitations/:token', meta: {} },
];

const locale = () => useNuxtApp().$i18n.locale.value;

/** A switch by hand, as a language menu does */
const switchTo = (code: string) =>
  useNuxtApp().$i18n.setLocale(code as 'en' | 'nl');

/** Runs the middleware alone for a navigation to `path` */
async function visit(path: string) {
  const router = useRouter();
  await localeMiddleware(
    router.resolve(path) as RouteLocationNormalized,
    router.currentRoute.value,
  );
  return locale();
}

/** Replaces the user object, as `refreshIdentity()` and a sign-in do */
async function identity(data: Record<string, unknown> | null) {
  if (data) signIn(data);
  else useSanctumAuth().user.value = null;
  await flushPromises();
  // setLocale() imports the messages
  await vi.dynamicImportSettled();
  await flushPromises();
}

/** As during the app's first navigation: the router is not ready until `done` */
function firstNavigation(done: Promise<unknown> = new Promise(() => {})) {
  vi.spyOn(useRouter(), 'isReady').mockReturnValue(done.then(() => {}));
}

beforeEach(async () => {
  for (const route of ROUTES)
    useRouter().addRoute({ ...route, component: Page });
  await switchTo('en');
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const { name } of ROUTES) useRouter().removeRoute(name);
  if (useRouter().hasRoute('test-slow')) useRouter().removeRoute('test-slow');
});

describe('the profile language (Academy)', () => {
  useScenario(academy);

  const user = (preferred_locale: string) => academy.user({ preferred_locale });

  it('is set before the first page, by the middleware', async () => {
    firstNavigation();
    signIn(user('nl'));

    await useRouter().push('/dashboard');
    expect(locale()).toBe('nl');
  });

  describe("with a project's i18n hook that throws", () => {
    beforeEach(() => {
      expectConsole('error', /The switch to the language "nl" failed/, 1);
      const unhook = useNuxtApp().hook('i18n:beforeLocaleSwitch', () => {
        throw new Error('A hook of the project');
      });
      onTestFinished(unhook);
    });

    it('goes on with the navigation, in the language it had', async () => {
      signIn(user('nl'));

      await useRouter().push('/dashboard');

      expect(useRouter().currentRoute.value.path).toBe('/dashboard');
      expect(locale()).toBe('en');
    });

    it('resolves apply() after a save, in the language it had', async () => {
      await useRouter().push('/dashboard');
      signIn(user('nl'));

      await expect(useProfileLocale().apply()).resolves.toBeUndefined();
      expect(locale()).toBe('en');
    });
  });

  it('applies after a sign-in, without a navigation', async () => {
    await identity(user('nl'));
    expect(locale()).toBe('nl');
  });

  it('applies after a profile save that changes it', async () => {
    await identity(user('nl'));
    await identity(user('en'));
    expect(locale()).toBe('en');
  });

  it('does not apply a field edited in place, before it is saved', async () => {
    await identity(user('nl'));

    const { user: current } = useSanctumAuth<{
      data: Record<string, unknown>;
    }>();
    current.value!.data.preferred_locale = 'en';
    await flushPromises();
    await useRouter().push('/profile');

    expect(locale()).toBe('nl');
  });

  it('keeps a switch by hand on a navigation and a refresh that keeps the profile language', async () => {
    await useRouter().push('/dashboard');
    await identity(user('nl'));
    await switchTo('en');

    await useRouter().push('/profile');
    expect(locale()).toBe('en');

    await identity(user('nl'));
    expect(locale()).toBe('en');
  });

  it('applies again when leaving a route with its own language', async () => {
    await identity(user('nl'));

    await useRouter().push('/en/catalog');
    expect(locale()).toBe('en');

    await useRouter().push('/dashboard');
    expect(locale()).toBe('nl');
  });

  it('applies again on a sign-in after a sign-out, after a switch by hand', async () => {
    await identity(user('nl'));
    await switchTo('en');

    await identity(null);
    await identity(user('nl'));

    expect(locale()).toBe('nl');
  });

  it('leaves the language of a route with its own when the identity arrives', async () => {
    await useRouter().push('/en/catalog');
    await identity(user('nl'));

    expect(locale()).toBe('en');
  });

  it('resolves against the page being loaded when the identity arrives during the first navigation', async () => {
    let load!: () => void;
    const loaded = new Promise<void>((resolve) => (load = resolve));
    useRouter().addRoute({
      name: 'test-slow',
      path: '/en/courses',
      meta: { locale: 'en' },
      component: () => loaded.then(() => Page),
    });
    await switchTo('nl');

    const navigation = useRouter().push('/en/courses');
    firstNavigation(navigation);
    await flushPromises();

    await identity(user('nl'));
    load();
    await navigation;
    await flushPromises();

    expect(useRouter().currentRoute.value.path).toBe('/en/courses');
    expect(locale()).toBe('en');
  });

  it("does not follow ?locale= on an app's own sign-in page", async () => {
    expect(await visit('/invitations/abc?locale=nl')).toBe('en');
  });
});

describe('the address', () => {
  useScenario(academy);

  it("follows the route's own language for a visitor", async () => {
    await useRouter().push('/en/catalog');
    expect(locale()).toBe('en');

    await useRouter().push('/catalog');
    expect(locale()).toBe('nl');

    await useRouter().push('/en/catalog');
    expect(locale()).toBe('en');
  });

  it('changes nothing for a visitor on a page without a language in its address', async () => {
    await switchTo('nl');
    expect(await visit('/dashboard')).toBe('nl');

    await switchTo('en');
    expect(await visit('/dashboard')).toBe('en');
  });

  it.each([
    '/reset-password?token=abc&email=a%40b.nl&locale=nl',
    '/login?locale=nl',
    '/forgot-password?locale=nl',
    '/two-factor-authentication?locale=nl',
  ])('shows %s in the language it asks for', async (path) => {
    expect(await visit(path)).toBe('nl');
  });

  it('follows ?locale= on every navigation, as a global middleware', async () => {
    await useRouter().push('/forgot-password?locale=nl');
    expect(locale()).toBe('nl');
  });

  it.each([
    '/mfa-setup?locale=nl',
    '/accessibility?locale=nl',
    '/login?locale=de',
  ])('ignores ?locale= in %s', async (path) => {
    expect(await visit(path)).toBe('en');
  });

  it('ignores ?locale= for a signed-in user', async () => {
    signIn(academy.user({ preferred_locale: undefined }));
    expect(await visit('/reset-password?locale=nl')).toBe('en');
  });
});

describe('the profile language (Auditor)', () => {
  useScenario(auditor);

  it("reads the user's language, then the team's", async () => {
    await identity(auditor.user({ language: 'nl', team: { language: 'en' } }));
    expect(locale()).toBe('nl');

    await identity(auditor.user({ language: null, team: { language: 'en' } }));
    expect(locale()).toBe('en');
  });

  it('reads only the fields the app names', async () => {
    await identity(auditor.user({ preferred_locale: 'nl' }));
    expect(locale()).toBe('en');
  });
});

/** Holds the next `setLocale()` until the returned function releases it */
function holdNextSetLocale() {
  const { $i18n } = useNuxtApp();
  const setLocale = $i18n.setLocale;
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  vi.spyOn($i18n, 'setLocale').mockImplementationOnce(async (code) => {
    await held;
    await setLocale(code);
  });
  return release;
}

describe('useProfileLocale().apply()', () => {
  useScenario(auditor);

  it('resolves once the interface shows the saved language, before the watcher would', async () => {
    await useRouter().push('/dashboard');
    await identity(auditor.user({ language: 'nl' }));

    signIn(auditor.user({ language: 'en' }));
    await useProfileLocale().apply();

    expect(locale()).toBe('en');
  });

  it('waits for a switch the watcher started', async () => {
    await useRouter().push('/dashboard');
    await identity(auditor.user({ language: 'nl' }));

    const { $i18n } = useNuxtApp();
    const release = holdNextSetLocale();

    signIn(auditor.user({ language: 'en' }));
    await flushPromises();
    expect($i18n.setLocale).toHaveBeenCalledOnce();

    let applied = false;
    const applying = useProfileLocale()
      .apply()
      .then(() => (applied = true));
    await flushPromises();
    expect(applied).toBe(false);

    release();
    await applying;
    expect(locale()).toBe('en');
  });

  it('keeps a switch by hand when the saved language is the one applied', async () => {
    await useRouter().push('/dashboard');
    await identity(auditor.user({ language: 'nl' }));
    await switchTo('en');

    signIn(auditor.user({ language: 'nl' }));
    await useProfileLocale().apply();

    expect(locale()).toBe('en');
  });
});

describe('the profile language without config', () => {
  it("reads no field of the layer's own", async () => {
    expect(
      (useAppConfig().cardanAuth as CardanAuthConfig).localeFields,
    ).toEqual([]);

    await identity({ preferred_locale: 'nl', language: 'nl', locale: 'nl' });
    await useRouter().push('/dashboard');
    expect(locale()).toBe('en');
  });
});

describe('the color mode from the profile', () => {
  let preference: string;

  beforeEach(() => {
    preference = useColorMode().preference;
  });

  afterEach(() => {
    useColorMode().preference = preference;
  });

  describe('Auditor', () => {
    useScenario(auditor);

    it('is left alone without a field named', async () => {
      useColorMode().preference = 'system';
      await identity(
        auditor.user({ settings: { theme: 'dark' }, theme: 'dark' }),
      );
      expect(useColorMode().preference).toBe('system');
    });
  });

  describe('Academy', () => {
    useScenario(academy);

    it('follows the profile after a load and after a save', async () => {
      useColorMode().preference = 'system';

      await identity(academy.user({ settings: { theme: 'dark' } }));
      expect(useColorMode().preference).toBe('dark');

      await identity(academy.user({ settings: { theme: 'light' } }));
      expect(useColorMode().preference).toBe('light');
    });

    it('keeps the color mode when the profile holds a value that is no mode', async () => {
      useColorMode().preference = 'dark';
      await identity(academy.user({ settings: { theme: 'sepia' } }));
      expect(useColorMode().preference).toBe('dark');
    });

    it('keeps the color mode when the profile has none', async () => {
      useColorMode().preference = 'dark';
      await identity(academy.user({ settings: { theme: '' } }));
      expect(useColorMode().preference).toBe('dark');
    });

    it('follows the profile on a route with its own language, which keeps its language', async () => {
      useColorMode().preference = 'system';
      await useRouter().push('/en/catalog');

      await identity(
        academy.user({ preferred_locale: 'nl', settings: { theme: 'dark' } }),
      );

      expect(useColorMode().preference).toBe('dark');
      expect(locale()).toBe('en');
    });

    it('follows the profile after a language switch by hand', async () => {
      await identity(
        academy.user({ preferred_locale: 'nl', settings: { theme: 'light' } }),
      );
      await switchTo('en');

      await identity(
        academy.user({ preferred_locale: 'nl', settings: { theme: 'dark' } }),
      );
      expect(useColorMode().preference).toBe('dark');
      expect(locale()).toBe('en');
    });
  });
});
