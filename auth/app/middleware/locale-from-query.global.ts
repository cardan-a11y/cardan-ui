/**
 * The signed-out pages of the layer in the language their link asks for
 * (`?locale=en`), such as the password reset email's link to
 * `/reset-password`: signed out, the app has no account to read a language
 * from. A signed-in user's own language wins, which the app applies. A
 * language the app does not offer is ignored.
 */
const SIGNED_OUT_PAGES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/two-factor-authentication',
];

export default defineNuxtRouteMiddleware(async (to) => {
  const locale = to.query.locale;
  if (typeof locale !== 'string' || !SIGNED_OUT_PAGES.includes(to.path)) {
    return;
  }

  const { isAuthenticated } = useAuth();
  if (isAuthenticated.value) return;

  const { $i18n } = useNuxtApp();
  const available = $i18n.availableLocales as string[];

  if (available.includes(locale) && $i18n.locale.value !== locale) {
    await $i18n.setLocale(locale as typeof $i18n.locale.value);
  }
});
