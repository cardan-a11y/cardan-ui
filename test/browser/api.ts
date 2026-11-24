import type {
  Expect,
  Page,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  Request,
  Route,
  TestType,
} from '@playwright/test';

/**
 * The API fake for Playwright: the page's requests to the API are answered
 * by the routes a test names, and a request to any other route fails the test
 * afterwards. The layer's api.spec.ts and visitor.spec.ts use it, and a
 * project's browser suite, with the project's own `test` and `expect`:
 *
 * ```ts
 * import { expect, test as base } from '@playwright/test';
 * import { withApi } from '../../../cardan-ui/test/browser/api';
 *
 * export const test = withApi(base, expect, {
 *   routes: { 'GET /sanctum/csrf-cookie': () => ({ status: 204 }) },
 * });
 *
 * test('…', async ({ page, api }) => {
 *   api.answer({ 'GET /api/audits/:id': ({ params }) => ({ body: { data: audit(params.id) } }) });
 * });
 * ```
 *
 * Routes the suite chooses by an option (a guest or a signed-in user) come
 * from the project's own automatic fixture that calls `api.answer()`.
 */

/** What a handler answers; `body` is sent as JSON, `text` as it is */
export type Answer = {
  status?: number;
  body?: unknown;
  text?: string;
  headers?: Record<string, string>;
};

export type ApiRequest = {
  /** `'GET /api/audits/:id'`: the route that answered, else method and path */
  route: string;
  method: string;
  /** Without a trailing slash */
  path: string;
  url: URL;
  /** The JSON body, or the text when it is not JSON */
  body: unknown;
  query: URLSearchParams;
  /** The values of a route's `:name` segments */
  params: Record<string, string>;
  answered: boolean;
};

export type Handler = (request: ApiRequest) => Answer | Promise<Answer>;

/**
 * Handlers by `'METHOD /path'`: an exact path (`'GET /api/v1/profile'`) or one
 * with `:name` segments (`'GET /api/audits/:id/stats'`); a trailing slash in
 * the request does not count
 */
export type Routes = Record<string, Handler>;

export interface ApiOptions {
  /** Routes every test starts with; a test's own routes win */
  routes?: Routes;
  /**
   * Which same-origin requests are the API: by default under `/api/` and
   * `/sanctum/`, not Nuxt's own under `/api/_` (such as `/api/_nuxt_icon/`)
   */
  isApi?: (url: URL) => boolean;
  /**
   * Headers on every answer, such as the `XSRF-TOKEN` cookie Laravel sets on
   * each, without which nuxt-auth-sanctum reads the user again on every
   * navigation
   */
  headers?: Record<string, string>;
  /** The content type of an answer from 400 up; `application/json` by default */
  errorType?: string;
  /** The status of an unanswered request, 599 by default */
  unansweredStatus?: number;
  /**
   * A request to another origin: `continue` (the default) lets it go to the
   * network, `abort` aborts it and fails the test, unless `api.external()`
   * answers it
   */
  otherOrigins?: 'continue' | 'abort';
  /** Guards every test, also one that never asks for `api`; true by default */
  auto?: boolean;
}

const defaultIsApi = (url: URL) =>
  url.pathname.startsWith('/sanctum/') ||
  (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/_'));

const trimSlash = (path: string) =>
  path.length > 1 ? path.replace(/\/$/, '') : path;

/** The route's `:name` values when the request matches it, else undefined */
export function matchRoute(
  key: string,
  method: string,
  path: string,
): Record<string, string> | undefined {
  const [keyMethod, keyPath = ''] = key.split(' ');
  if (keyMethod !== method.toUpperCase()) return undefined;

  const want = trimSlash(keyPath).split('/');
  const got = trimSlash(path).split('/');
  if (want.length !== got.length) return undefined;

  const params: Record<string, string> = {};
  for (const [i, part] of want.entries()) {
    if (part.startsWith(':'))
      params[part.slice(1)] = decodeURIComponent(got[i]!);
    else if (part !== got[i]) return undefined;
  }
  return params;
}

function bodyOf(request: Request): unknown {
  const text = request.postData();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class Api {
  private routes: Routes;
  private externals: {
    match: (request: Request) => boolean;
    handler: Handler;
  }[] = [];

  /** Every request to the API and every external one, in order */
  readonly requests: ApiRequest[] = [];
  /** What went unanswered, as `'GET /api/nothing'`; fails the test */
  readonly unanswered: string[] = [];

  constructor(
    private page: Page,
    private options: ApiOptions = {},
  ) {
    this.routes = { ...options.routes };
  }

  /** The API answers these routes too, over the ones before */
  answer(routes: Routes) {
    Object.assign(this.routes, routes);
  }

  /** Answers a request to another origin, such as a navigation to a payment page */
  external(match: (request: Request) => boolean, handler: Handler) {
    this.externals.push({ match, handler });
  }

  /** The bodies of the requests a route answered, in order */
  bodies(route: string): unknown[] {
    return this.requests.filter((r) => r.route === route).map((r) => r.body);
  }

  /** The requests to a path (without the query), any method */
  requestsTo(path: string): ApiRequest[] {
    return this.requests.filter((r) => r.path === trimSlash(path));
  }

  async install(origin: string) {
    const isApi = this.options.isApi ?? defaultIsApi;
    await this.page.route(
      (url) => url.origin === origin && isApi(url),
      (route) => this.handle(route),
    );
    if (this.options.otherOrigins === 'abort') {
      await this.page.route(
        (url) => url.origin !== origin && /^https?:$/.test(url.protocol),
        (route) => this.handleExternal(route),
      );
    }
  }

  private record(request: Request, route?: string, params = {}): ApiRequest {
    const url = new URL(request.url());
    const path = trimSlash(url.pathname);
    const entry: ApiRequest = {
      route: route ?? `${request.method()} ${path}`,
      method: request.method(),
      path,
      url,
      body: bodyOf(request),
      query: url.searchParams,
      params,
      answered: route !== undefined,
    };
    this.requests.push(entry);
    return entry;
  }

  private async fulfill(route: Route, answer: Answer) {
    const status = answer.status ?? 200;
    const json = answer.text === undefined && answer.body !== undefined;
    await route.fulfill({
      status,
      headers: {
        ...(json
          ? {
              'Content-Type':
                status >= 400
                  ? (this.options.errorType ?? 'application/json')
                  : 'application/json',
            }
          : {}),
        ...this.options.headers,
        ...answer.headers,
      },
      body: json ? JSON.stringify(answer.body) : (answer.text ?? ''),
    });
  }

  private async handle(route: Route) {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    // An exact route first, then the last one added whose segments match
    const exact = `${request.method()} ${trimSlash(path)}`;
    const keys = [
      ...(this.routes[exact] ? [exact] : []),
      ...Object.keys(this.routes).reverse(),
    ];
    for (const key of keys) {
      const params = matchRoute(key, request.method(), path);
      if (!params) continue;
      return this.fulfill(
        route,
        await this.routes[key]!(this.record(request, key, params)),
      );
    }

    const entry = this.record(request);
    this.unanswered.push(entry.route);
    return route.fulfill({
      status: this.options.unansweredStatus ?? 599,
      headers: this.options.headers,
      body: `No route for ${entry.route}`,
    });
  }

  private async handleExternal(route: Route) {
    const request = route.request();
    const external = this.externals.find(({ match }) => match(request));
    if (external) {
      return this.fulfill(
        route,
        await external.handler(
          this.record(request, `${request.method()} ${request.url()}`),
        ),
      );
    }
    this.record(request);
    this.unanswered.push(`${request.method()} ${request.url()}`);
    return route.abort();
  }
}

/**
 * The project's `test` with an `api` fixture: installed before the page
 * loads, and after the test it fails on every request no route answered.
 */
export function withApi(
  base: TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >,
  expect: Expect,
  options: ApiOptions = {},
) {
  return base.extend<{ api: Api }>({
    api: [
      async ({ page, baseURL }, use) => {
        const api = new Api(page, options);
        await api.install(new URL(baseURL!).origin);
        await use(api);
        expect(api.unanswered, 'API requests no route answered').toEqual([]);
      },
      { auto: options.auto ?? true },
    ],
  });
}
