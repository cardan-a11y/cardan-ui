import { expect, test as base, type Page } from '@playwright/test';
import { matchRoute, withApi } from './api';
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

test('a request no route answers fails the test afterwards', async ({
  page,
  api,
}) => {
  // The failure is the fixture's check after the test
  test.fail();
  await gotoHydrated(page, '/buttons');

  expect((await send(page, '/api/nothing')).status).toBe(599);
  expect(api.unanswered).toEqual(['GET /api/nothing']);
});

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
