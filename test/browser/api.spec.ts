import { expect, test as base, type Page } from '@playwright/test';
import { Api, matchRoute, withApi } from './api';
import { gotoHydrated } from './helpers';

/** The Playwright API fake of api.ts, as a project uses it */
const test = withApi(base, expect, {
  routes: {
    'GET /api/user': () => ({
      status: 401,
      body: { message: 'Unauthenticated.' },
    }),
  },
  headers: { 'Set-Cookie': 'XSRF-TOKEN=browser-suite; Path=/; SameSite=Lax' },
});

const send = (
  page: Page,
  path: string,
  init?: { method?: string; body?: string },
) =>
  page.evaluate(
    async ([path, init]) => {
      const response = await fetch(path, init);
      return { status: response.status, text: await response.text() };
    },
    [path, init] as const,
  );

test('answers the routes a test names, with their segments, and records the requests', async ({
  page,
  api,
}) => {
  api.answer({
    'GET /api/audits/:id/stats': ({ params, query }) => ({
      body: { id: params.id, page: query.get('page') },
    }),
    'POST /api/audits': ({ body }) => ({ status: 201, body }),
  });
  await gotoHydrated(page, '/buttons');

  expect(await send(page, '/api/audits/7/stats/?page=2')).toEqual({
    status: 200,
    text: '{"id":"7","page":"2"}',
  });
  expect(
    await send(page, '/api/audits', {
      method: 'POST',
      body: JSON.stringify({ title: 'Shop' }),
    }),
  ).toMatchObject({ status: 201 });

  expect(api.bodies('POST /api/audits')).toEqual([{ title: 'Shop' }]);
  expect(api.requestsTo('/api/audits/7/stats').map((r) => r.route)).toEqual([
    'GET /api/audits/:id/stats',
  ]);
});

test('a request no route answers gets 599 and is kept as unanswered', async ({
  page,
  api,
}) => {
  await gotoHydrated(page, '/buttons');

  expect(await send(page, '/api/nothing')).toEqual({
    status: 599,
    text: 'No route for GET /api/nothing',
  });
  expect(api.unanswered).toEqual(['GET /api/nothing']);
  expect(api.requestsTo('/api/nothing')).toMatchObject([{ answered: false }]);

  // Taken here so this test passes; the next test leaves it to the fixture
  api.unanswered.splice(0);
});

// No `expect` of its own: the only failure that can count as the expected one
// is the fixture's check after the test
test('a request no route answers fails the test afterwards', async ({
  page,
  // Asked for, as a test that reads it does; the next test does not
  api: _api,
}) => {
  test.fail();
  await gotoHydrated(page, '/buttons');
  await send(page, '/api/nothing');
});

test('a request no route answers fails a test that never asks for `api` too', async ({
  page,
}) => {
  test.fail();
  await gotoHydrated(page, '/buttons');
  await send(page, '/api/nothing');
});

test("an exact route wins over a `:name` route, and a test's routes over the suite's", async ({
  page,
  api,
}) => {
  api.answer({
    'GET /api/audits/new': () => ({ body: 'exact' }),
    'GET /api/audits/:id': ({ params }) => ({ body: params.id }),
    'GET /api/user': () => ({ body: { id: 1 } }),
  });
  await gotoHydrated(page, '/buttons');

  expect((await send(page, '/api/audits/new')).text).toBe('"exact"');
  expect((await send(page, '/api/audits/7')).text).toBe('"7"');
  expect(await send(page, '/api/user')).toEqual({
    status: 200,
    text: '{"id":1}',
  });
});

test("every answer has the suite's headers, an unanswered one too", async ({
  page,
  api,
}) => {
  await gotoHydrated(page, '/buttons');

  // The suite's Set-Cookie: the browser keeps the cookie from either answer
  for (const path of ['/api/user', '/api/nothing']) {
    await page.context().clearCookies();
    await send(page, path);
    expect(await page.context().cookies()).toContainEqual(
      expect.objectContaining({ name: 'XSRF-TOKEN', value: 'browser-suite' }),
    );
  }

  expect(api.unanswered).toEqual(['GET /api/nothing']);
  api.unanswered.splice(0);
});

test('a route added again counts as the last one added', async ({
  page,
  api,
}) => {
  const byId = () => ({ body: 'by id' });
  api.answer({
    'GET /api/audits/:id': byId,
    'GET /api/:list/7': () => ({ body: 'by list' }),
  });
  api.answer({ 'GET /api/audits/:id': byId });
  await gotoHydrated(page, '/buttons');

  expect((await send(page, '/api/audits/7')).text).toBe('"by id"');
});

test('a handler that throws is answered as unanswered, with its error', async ({
  page,
  api,
}) => {
  api.answer({
    'GET /api/audits/:id': () => {
      throw new Error('No audit 7 in this test');
    },
  });
  await gotoHydrated(page, '/buttons');

  expect(await send(page, '/api/audits/7')).toEqual({
    status: 599,
    text: 'GET /api/audits/:id threw Error: No audit 7 in this test',
  });
  expect(api.unanswered).toEqual([
    'GET /api/audits/7: GET /api/audits/:id threw Error: No audit 7 in this test',
  ]);
  expect(api.requestsTo('/api/audits/7')).toMatchObject([
    { route: 'GET /api/audits/:id', answered: false },
  ]);
  api.unanswered.splice(0);
});

test('a route key no request can match throws when it is added', ({
  page,
  api,
}) => {
  for (const key of [
    'get /api/audits',
    'GET /api/audits?page=2',
    'GET api/audits',
  ]) {
    expect(() => api.answer({ [key]: () => ({}) }), key).toThrow(
      `Route "${key}" never matches`,
    );
  }
  // The suite's routes too
  expect(
    () => new Api(page, { routes: { 'post /api/audits': () => ({}) } }),
  ).toThrow('Route "post /api/audits" never matches');
});

/** The options a suite sets for a stricter API */
const strict = withApi(base, expect, {
  routes: { 'GET /api/user': () => ({ status: 401, body: {} }) },
  errorType: 'application/problem+json',
  unansweredStatus: 404,
  otherOrigins: 'abort',
});

strict(
  "an error answer has the suite's content type, an unanswered request its status",
  async ({ page, api }) => {
    api.answer({
      'POST /api/audits': () => ({ status: 422, body: { message: 'Invalid' } }),
      'GET /api/audits': () => ({ body: [] }),
    });
    await gotoHydrated(page, '/buttons');

    const types = await page.evaluate(async () =>
      Promise.all(
        [
          fetch('/api/audits', { method: 'POST' }),
          fetch('/api/audits'),
          fetch('/api/nothing'),
        ].map(async (request) => {
          const response = await request;
          return `${response.status} ${response.headers.get('content-type')}`;
        }),
      ),
    );
    expect(types).toEqual([
      '422 application/problem+json',
      '200 application/json',
      '404 null',
    ]);

    expect(api.unanswered).toEqual(['GET /api/nothing']);
    api.unanswered.splice(0);
  },
);

strict(
  'another origin is aborted and kept as unanswered, unless `external()` answers it',
  async ({ page, api }) => {
    api.external(
      (request) => request.url().startsWith('https://pay.example.com/'),
      () => ({ text: 'Paid', headers: { 'Content-Type': 'text/html' } }),
    );
    await gotoHydrated(page, '/buttons');

    const fetched = await page.evaluate(() =>
      fetch('https://elsewhere.example.com/x').then(
        () => 'answered',
        () => 'failed',
      ),
    );
    expect(fetched).toBe('failed');
    expect(api.unanswered).toEqual(['GET https://elsewhere.example.com/x']);
    api.unanswered.splice(0);

    await page.goto('https://pay.example.com/return');
    await expect(page.locator('body')).toHaveText('Paid');
    expect(api.unanswered).toEqual([]);
  },
);

strict(
  'an `external()` handler that throws aborts the request and keeps its error',
  async ({ page, api }) => {
    api.external(
      (request) => request.url().startsWith('https://pay.example.com/'),
      () => {
        throw new Error('No payment in this test');
      },
    );
    await gotoHydrated(page, '/buttons');

    const fetched = await page.evaluate(() =>
      fetch('https://pay.example.com/x').then(
        () => 'answered',
        () => 'failed',
      ),
    );
    expect(fetched).toBe('failed');
    expect(api.unanswered).toEqual([
      'GET https://pay.example.com/x: the handler threw Error: No payment in this test',
    ]);
    expect(api.requestsTo('/x')).toMatchObject([{ answered: false }]);
    api.unanswered.splice(0);
  },
);

test('the route key: method, exact segments, `:name` segments, no trailing slash', () => {
  expect(matchRoute('GET /api/audits/:id', 'get', '/api/audits/7/')).toEqual({
    id: '7',
  });
  expect(
    matchRoute('GET /api/audits/:id', 'POST', '/api/audits/7'),
  ).toBeUndefined();
  expect(matchRoute('GET /api/audits', 'GET', '/api/audits/7')).toBeUndefined();
  expect(matchRoute('GET /api/v1/profile', 'GET', '/api/v1/profile')).toEqual(
    {},
  );
});
