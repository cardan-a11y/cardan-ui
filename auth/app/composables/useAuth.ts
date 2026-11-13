import type { RouteLocationNormalized } from 'vue-router';

/**
 * The app's authentication surface: nuxt-auth-sanctum's client and identity,
 * plus the login primitives the MFA flow needs.
 *
 * `user` is typed through the global `AuthUser` interface, which each app
 * augments with its own payload — see `app/types/index.ts`.
 */
export function useAuth() {
  const client = useSanctumClient();
  const config = useSanctumConfig();

  const { user, isAuthenticated, init, login, logout, refreshIdentity } =
    useSanctumAuth<{ data: AuthUser }>();

  /**
   * Read through a local type rather than putting `name` on `AuthUser`: apps
   * augment that interface with their own payload, and a field declared here
   * would clash with a required `name` on their side.
   */
  const userName = computed(
    () => (user.value?.data as { name?: string } | undefined)?.name,
  );

  const userInitials = computed(() =>
    userName.value
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join(''),
  );

  /**
   * Posts the credentials and hands back the raw response, without letting
   * nuxt-auth-sanctum fetch the identity or redirect on its own.
   *
   * Both matter when two-factor authentication is enabled: the session is not
   * usable yet, so fetching the identity would fail and redirecting would
   * skip the second factor. Use `login()` instead when an app has no MFA.
   */
  async function loginWithoutRedirect(credentials: LoginCredentials) {
    if (!config.endpoints.login) {
      throw new Error('`sanctum.endpoints.login` is not configured');
    }

    return await client<LoginResponse>(config.endpoints.login, {
      method: 'POST',
      body: credentials,
    });
  }

  /**
   * Where to go once a login has fully succeeded, mirroring the rules
   * nuxt-auth-sanctum's own `login()` applies — the requested route when
   * `redirect.keepRequestedRoute` is on, otherwise `redirect.onLogin`.
   * The requested route only counts when it is a path within this app, so a
   * `?redirect=` to another site falls back to `redirect.onLogin`.
   * Returns `false` when the app has opted out of redirecting.
   *
   * Pass the route being navigated to when calling it from route middleware,
   * where `useRoute()` still holds the previous route.
   */
  function loginRedirectTarget(
    route: RouteLocationNormalized = useRoute(),
  ): string | false {
    if (config.redirect.keepRequestedRoute) {
      const requested = route.query.redirect;

      if (typeof requested === 'string' && requested.startsWith('/')) {
        // Read the way the browser reads it: it drops tabs and line breaks
        // and takes a backslash for a slash, so `/\t/evil.com` is another
        // site, which navigateTo() would refuse after the sign-in succeeded.
        // The path it returns is the one the browser would go to.
        const base = 'http://localhost';
        const url = new URL(requested, base);

        // Resolving dot segments can still leave a path that starts with two
        // slashes (`/.//evil.com`, `/%2e//evil.com`), which navigateTo() reads
        // as another site too; so can decoding it (`/%09/evil.com`). Such a
        // path is never a page of the app.
        let decoded: string;
        try {
          decoded = decodeURIComponent(url.pathname);
        } catch {
          decoded = '//';
        }

        if (url.origin === base && !/^\/\s*[/\\]/.test(decoded)) {
          return url.pathname + url.search + url.hash;
        }
      }
    }

    return config.redirect.onLogin ?? '/';
  }

  return {
    client,
    user,
    userName,
    userInitials,
    isAuthenticated,
    init,
    login,
    loginWithoutRedirect,
    logout,
    refreshIdentity,
    loginRedirectTarget,
  };
}
