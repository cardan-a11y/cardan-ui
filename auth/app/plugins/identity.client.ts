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

    const data = response._data;
    if (
      response.ok &&
      data &&
      typeof data === 'object' &&
      user.value === null
    ) {
      user.value = data;
    }
  } catch {
    // A failed or timed-out request: a guest
  }
}

// In place of nuxt-auth-sanctum's initial request, which would put one
// visitor's profile in a cached page. Runs after the module's plugin, as
// module plugins come first; test/auth/identity.test.ts fails at start-up if not.
export default defineNuxtPlugin({
  name: 'cardan-auth:identity',
  setup() {
    if (!useSanctumClient()) {
      throw new Error(
        "[cardan-auth] The identity plugin ran before nuxt-auth-sanctum's: no Sanctum client.",
      );
    }
    return { provide: { identityReady: loadIdentity() } };
  },
});
