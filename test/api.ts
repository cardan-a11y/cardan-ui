import { vi, type Mock } from 'vitest';

/**
 * The API fake for vitest: nuxt-auth-sanctum's client, answering only the
 * routes a test names. A request to any other route fails that test
 * afterwards, so a flow cannot pass on a request nobody modelled.
 *
 * test/api-setup.ts puts `client` in place of `useSanctumClient` for every
 * test and checks the unanswered requests after each one; a project lists it
 * with `sanctumClient: true` in `cardanVitestConfig()` (test/config/vitest.ts),
 * the layer in its vitest.config.ts. A test then only names its routes:
 *
 * ```ts
 * import { api, requests } from '#layer-test/api';
 *
 * api({ 'POST /api/v1/checkout/quotes': ({ body }) => ({ data: quote(body) }) });
 * ```
 *
 * `mockNuxtImport()` works in a test file or a setup file, not in a helper a
 * test file imports. A test file that keeps its own line still works beside
 * the setup file; one that needs the real client restores it in its own file
 * with `mockNuxtImport('useSanctumClient', (original) => original)`.
 */

/** What the app passes the client besides the address */
export type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
};

/** Answers a request: the value is the response, a throw its failure */
export type Handler = (options: RequestOptions) => unknown;

/** Handlers by `'METHOD /path'` (`'GET /api/user'`), without a trailing slash */
export type Routes = Record<string, Handler>;

type Store = {
  client: Mock & { raw: Mock };
  unanswered: string[];
};

// Vitest evaluates this module for the setup file and again for each test
// file: both copies share this one store. No hooks are registered here
const shared = globalThis as typeof globalThis & { cardanApi?: Store };

shared.cardanApi ??= {
  client: Object.assign(vi.fn(), { raw: vi.fn() }),
  unanswered: [],
};

const store = shared.cardanApi;

/**
 * The Sanctum client every request goes through. `client.raw` is the auth
 * layer's identity request: a guest's 401 unless a test answers it, a
 * response rather than its body.
 */
export const client = store.client;

/** `'GET /api/user'`: the method and the address without a trailing slash */
export function routeOf(url: string, options: RequestOptions = {}): string {
  const path = url.length > 1 ? url.replace(/\/$/, '') : url;
  return `${(options.method ?? 'GET').toUpperCase()} ${path}`;
}

/** The API answers these routes, and only these, until the test ends */
export function api(routes: Routes) {
  client.mockImplementation(
    async (url: string, options: RequestOptions = {}) => {
      const route = routeOf(url, options);
      const handler = routes[route];

      if (!handler) {
        store.unanswered.push(route);
        throw new Error(`No route for ${route}`);
      }

      return await handler(options);
    },
  );
}

/**
 * The options of the requests sent to a route, in order; without a route,
 * every request sent so far as `'GET /api/user'`
 */
export function requests(route: string): RequestOptions[];
export function requests(): string[];
export function requests(route?: string): RequestOptions[] | string[] {
  const calls = client.mock.calls as [string, RequestOptions | undefined][];
  if (route === undefined) {
    return calls.map(([url, options]) => routeOf(url, options));
  }
  return calls
    .filter(([url, options]) => routeOf(url, options) === route)
    .map(([, options]) => options ?? {});
}

/**
 * Back to an API that answers nothing, with a guest's identity request;
 * hands over the requests that went unanswered since the last reset
 */
export function resetApi(): string[] {
  client.mockReset();
  api({});
  client.raw.mockReset();
  client.raw.mockResolvedValue({ ok: false, status: 401, _data: undefined });
  return store.unanswered.splice(0);
}
