/**
 * The layer's sign-in pages, for `isAuthPage()`: the frame an app shows
 * without navigation.
 */
export const AUTH_PAGES: readonly string[] = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/two-factor-authentication',
  '/mfa-setup',
];

/**
 * Whether a path, with or without its query and hash, is a sign-in page: one
 * of `AUTH_PAGES` or of the app's `cardanAuth.authPages`, where an entry that
 * ends in `/` is a prefix (`/invitations/` matches `/invitations/abc`). A
 * trailing slash is ignored, as nuxt-auth-sanctum does: `/login/` is `/login`.
 */
export function isAuthPage(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0]!;
  const trimmed =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  return [...AUTH_PAGES, ...useCardanAuthConfig().authPages].some((page) =>
    page.endsWith('/') ? pathname.startsWith(page) : trimmed === page,
  );
}
