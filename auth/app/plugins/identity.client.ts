const IDENTITY_TIMEOUT_MS = 10_000;

/**
 * Asks the API once for the user, unless someone else has loaded one, and
 * never throws: without an answer the app goes on with a guest.
 */
export async function loadIdentity(): Promise<void> {
  try {
    const config = useSanctumConfig();
    const user = useSanctumUser<{ data: AuthUser }>();
    if (user.value !== null || !config.endpoints.user) return;

    const response = await useSanctumClient().raw<{ data: AuthUser }>(
      config.endpoints.user,
      { ignoreResponseError: true, timeout: IDENTITY_TIMEOUT_MS },
    );

    if (response.ok && response._data && user.value === null) {
      user.value = response._data;
    }
  } catch {
    // A failed or timed-out request: a guest
  }
}

// In place of nuxt-auth-sanctum's initial request, which would put one
// visitor's profile in a cached page. Tripwire: test/tripwires.test.ts.
export default defineNuxtPlugin({
  name: 'cardan-auth:identity',
  dependsOn: ['nuxt-auth-sanctum'],
  setup() {
    return { provide: { identityReady: loadIdentity() } };
  },
});
