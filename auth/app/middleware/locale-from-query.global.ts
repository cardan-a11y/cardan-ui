// The signed-out pages in the language their link asks for (`?locale=en`), as
// the reset email's: there is no account to read one from
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
