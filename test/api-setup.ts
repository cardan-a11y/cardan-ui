import { afterEach, beforeEach, expect } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { resetApi } from './api';

/**
 * Setup file: nuxt-auth-sanctum's client is the API fake of test/api.ts in
 * every test, and a request no route answered fails the test. Listed by the
 * layer's vitest.config.ts and by `sanctumClient: true` in a project's
 * `cardanVitestConfig()`. Not part of test/setup.ts: a project without
 * nuxt-auth-sanctum has no client to mock.
 */

// The factory reads the store when the app asks for the client, so it is the
// one the test file's copy of test/api.ts hands out
mockNuxtImport(
  'useSanctumClient',
  () => () =>
    (globalThis as { cardanApi?: { client: unknown } }).cardanApi!.client,
);

beforeEach(() => {
  resetApi();
});

afterEach(() => {
  expect(resetApi(), 'requests to routes the test did not answer').toEqual([]);
});
