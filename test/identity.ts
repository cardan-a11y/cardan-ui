/**
 * The auth layer's identity load, for a project's test of its start-up:
 * `$identityReady` is created once per test file, so a test calls
 * `loadIdentity()` after naming the identity route with `api()` (test/api.ts),
 * which `client.raw` answers:
 *
 * ```ts
 * import { api } from '#layer-test/api';
 * import { loadIdentity } from '#layer-test/identity';
 *
 * api({ 'GET /api/user': () => ({ data: user }) });
 * await loadIdentity();
 * ```
 *
 * From here, so the plugin's file can move without breaking a project's test.
 */
export { loadIdentity } from '../auth/app/plugins/identity.client';
