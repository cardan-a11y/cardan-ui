// The pages a visitor reaches from a link with `?locale=` (the reset email's):
// there is no account to read a language from
const SIGNED_OUT_PAGES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/two-factor-authentication',
];

/** The value at a dotted path of the user payload (`team.language`). */
export function profileField(
  data: Record<string, unknown> | null | undefined,
  path: string,
): unknown {
  let value: unknown = data;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export type ResolvedLocale = {
  locale: string;
  /** `address`: the route's own language or `?locale=`; `profile`: the user's */
  source: 'address' | 'profile';
};

/**
 * The language the interface should show, from the address or the profile,
 * or `null` to leave it as it is. The address wins: the route's own language
 * (`meta.locale`), then `?locale=` on a signed-out page for a visitor; else,
 * for a signed-in user, the first of `localeFields` that holds a language the
 * app offers.
 */
export function resolveLocale(input: {
  route: {
    path: string;
    query: Record<string, unknown>;
    meta: { locale?: string };
  };
  /** The identity's `data`, `null` for a visitor */
  user: Record<string, unknown> | null | undefined;
  localeFields: readonly string[];
  /** The languages the app offers */
  locales: readonly string[];
}): ResolvedLocale | null {
  const { route, user, localeFields, locales } = input;
  const offered = (value: unknown): value is string =>
    typeof value === 'string' && locales.includes(value);

  if (offered(route.meta.locale)) {
    return { locale: route.meta.locale, source: 'address' };
  }

  if (!user) {
    const path =
      route.path.length > 1 && route.path.endsWith('/')
        ? route.path.slice(0, -1)
        : route.path;
    const query = route.query.locale;

    return SIGNED_OUT_PAGES.includes(path) && offered(query)
      ? { locale: query, source: 'address' }
      : null;
  }

  for (const field of localeFields) {
    const value = profileField(user, field);
    if (offered(value)) return { locale: value, source: 'profile' };
  }

  return null;
}
