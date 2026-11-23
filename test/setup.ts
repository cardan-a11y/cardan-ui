import { afterEach, expect } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';
import { registerEndpoint } from '@nuxt/test-utils/runtime';
import * as matchers from 'vitest-axe/matchers';

expect.extend(matchers);

// A failed test must not leave its component for the next test's axe run
enableAutoUnmount(afterEach);

// The auth layer's identity request at start-up, to the playground's
// `sanctum.baseUrl`: a guest, whether or not a dev server listens there
if (typeof window !== 'undefined') {
  registerEndpoint(
    'http://localhost:3003/api/user',
    () => new Response('{"message":"Unauthenticated."}', { status: 401 }),
  );
}
