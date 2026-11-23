import { describe, it, expect, onTestFinished, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime';
import { createFetch } from 'ofetch';
import { useNuxtApp, useRuntimeConfig, useSanctumAuth } from '#imports';
import identityPlugin, {
  loadIdentity,
} from '../../auth/app/plugins/identity.client';
import { signIn, useScenario } from './fortify';
import { academy, auditor } from './scenarios';

// The real Sanctum client, unless a test puts another in its place
const clientOverride = vi.hoisted(() => ({ current: undefined as unknown }));
mockNuxtImport(
  'useSanctumClient',
  () => () => clientOverride.current ?? useNuxtApp().$sanctumClient,
);

/** The API behind the identity endpoint, for this test; counts its requests */
function identityApi(
  endpoint: string,
  answer: (event: unknown) => Response | Promise<Response>,
) {
  const baseUrl = useRuntimeConfig().public.sanctum.baseUrl as string;
  const handler = vi.fn(answer);
  onTestFinished(registerEndpoint(`${baseUrl}${endpoint}`, handler));
  return handler;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/**
 * A client on the real ofetch, with the retry nuxt-auth-sanctum's client
 * takes from `sanctum.client.retry`, whose network never answers until aborted
 */
function hangingClient() {
  const { retry } = useRuntimeConfig().public.sanctum.client as {
    retry: number | boolean;
  };
  const fetch = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal!.reason),
        );
      }),
  );
  const client = createFetch({ fetch }).create({
    baseURL: 'https://api.example.com',
    retry: retry === true ? 1 : retry,
  });
  return { client, fetch };
}

async function settled(promise: Promise<unknown>) {
  let done = false;
  void promise.then(() => (done = true));
  await flushPromises();
  return done;
}

describe('identity load (Academy)', () => {
  useScenario(academy);

  const { user } = academy.sanctum.endpoints;

  it('is under way from start-up, as $identityReady', async () => {
    const ready = useNuxtApp().$identityReady;
    expect(ready).toBeInstanceOf(Promise);
    await expect(ready).resolves.toBeUndefined();
  });

  it('loads the signed-in user', async () => {
    const data = academy.user();
    const api = identityApi(user, () => json({ data }));

    await loadIdentity();

    expect(api).toHaveBeenCalledOnce();
    expect(useSanctumAuth().user.value).toEqual({ data });
    expect(useSanctumAuth().isAuthenticated.value).toBe(true);
  });

  it('does not hold up the app while the API is slow, and resolves once it answers', async () => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    identityApi(user, async () => {
      await answered;
      return json({ data: academy.user() });
    });

    const result = identityPlugin(useNuxtApp());

    expect(result).not.toBeInstanceOf(Promise);
    const ready = (result as { provide: { identityReady: Promise<void> } })
      .provide.identityReady;
    expect(await settled(ready)).toBe(false);

    answer();
    await expect(ready).resolves.toBeUndefined();
    expect(useSanctumAuth().isAuthenticated.value).toBe(true);
  });

  it.each([
    ['a server error', 500],
    ['a guest (401)', 401],
    ['an expired session (419)', 419],
  ])('resolves as a guest after %s, and asks once', async (_, status) => {
    const api = identityApi(user, () =>
      json({ message: 'Nope.' }, status as number),
    );

    await expect(loadIdentity()).resolves.toBeUndefined();

    expect(api).toHaveBeenCalledOnce();
    expect(useSanctumAuth().user.value).toBeNull();
  });

  it('gives up after 10 seconds, without asking again', async () => {
    const { client, fetch } = hangingClient();
    clientOverride.current = client;
    onTestFinished(() => (clientOverride.current = undefined));
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });

    const ready = loadIdentity();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(await settled(ready)).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(ready).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetch).toHaveBeenCalledOnce();
    expect(useSanctumAuth().user.value).toBeNull();
  });

  it('resolves when the client throws before the request', async () => {
    // As an app's test mocks `useSanctumClient` without `.raw`
    clientOverride.current = vi.fn();
    onTestFinished(() => (clientOverride.current = undefined));

    await expect(loadIdentity()).resolves.toBeUndefined();
    expect(useSanctumAuth().user.value).toBeNull();
  });

  it('does not ask when a user is already loaded', async () => {
    signIn(academy.user({ name: 'Grace Hopper' }));
    const api = identityApi(user, () => json({ data: academy.user() }));

    await loadIdentity();

    expect(api).not.toHaveBeenCalled();
    expect(useSanctumAuth().user.value).toEqual({
      data: academy.user({ name: 'Grace Hopper' }),
    });
  });

  it('keeps a user loaded by someone else while its request was under way', async () => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    identityApi(user, async () => {
      await answered;
      return json({ data: academy.user({ name: 'Stale Answer' }) });
    });

    const ready = loadIdentity();
    await flushPromises();
    signIn(academy.user({ name: 'Grace Hopper' }));
    answer();
    await ready;

    expect(useSanctumAuth().user.value).toEqual({
      data: academy.user({ name: 'Grace Hopper' }),
    });
  });
});

describe('identity load (Auditor)', () => {
  useScenario(auditor);

  it("asks the app's own identity endpoint", async () => {
    const data = auditor.user();
    const api = identityApi(auditor.sanctum.endpoints.user, () =>
      json({ data }),
    );

    await loadIdentity();

    expect(api).toHaveBeenCalledOnce();
    expect(useSanctumAuth().user.value).toEqual({ data });
  });
});

describe('Accept-Language', () => {
  useScenario(academy);

  it('carries the interface language on every Sanctum request, after a switch too', async () => {
    const languages: (string | null)[] = [];
    identityApi(academy.sanctum.endpoints.user, (event) => {
      languages.push(
        (event as unknown as { headers: Headers }).headers.get(
          'accept-language',
        ),
      );
      return json({ message: 'Unauthenticated.' }, 401);
    });
    const { $i18n } = useNuxtApp();
    const before = $i18n.locale.value;
    onTestFinished(() => $i18n.setLocale(before));

    await $i18n.setLocale('nl');
    await loadIdentity();
    await $i18n.setLocale('en');
    await loadIdentity();

    expect(languages).toEqual(['nl', 'en']);
  });
});
