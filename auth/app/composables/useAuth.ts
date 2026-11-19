import type { RouteLocationNormalized } from 'vue-router';

/**
 * nuxt-auth-sanctum's client and identity, plus the login helpers the MFA
 * flow needs. `user` is typed by the global `AuthUser`, which each app augments.
 */
export function useAuth() {
  const client = useSanctumClient();
  const config = useSanctumConfig();

  const { user, isAuthenticated, init, login, logout, refreshIdentity } =
    useSanctumAuth<{ data: AuthUser }>();

  // Not declared on `AuthUser`: it would clash with an app's own required `name`
  const userName = computed(
    () => (user.value?.data as { name?: string } | undefined)?.name,
  );

  /** The first letters of the first and the last name: "Jan van Dam" is "JD". */
  const userInitials = computed(() => {
    const parts = userName.value?.trim().split(/\s+/).filter(Boolean);
    if (!parts?.length) return undefined;

    const first = parts[0]!;
    const last = parts.length > 1 ? parts[parts.length - 1]! : '';
    return (first[0] ?? '') + (last[0] ?? '');
  });

  /**
   * Posts the credentials without fetching the identity or redirecting, as a
   * pending second factor needs. Without MFA, use `login()`.
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
   * Where a completed sign-in goes, by nuxt-auth-sanctum's rules: the requested
   * route when `keepRequestedRoute` is on and it is a path of this app, else
   * `onLogin`; `false` when the app opted out. Route middleware passes `to`.
   */
  function loginRedirectTarget(
    route: RouteLocationNormalized = useRoute(),
  ): string | false {
    if (config.redirect.keepRequestedRoute) {
      const requested = route.query.redirect;

      if (typeof requested === 'string' && requested.startsWith('/')) {
        const base = 'http://localhost';
        const url = new URL(requested, base);

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
