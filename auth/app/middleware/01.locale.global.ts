// The profile only on the first navigation and when leaving a route with its
// own language: a language switched by hand stays for the session
export default defineNuxtRouteMiddleware(async (to, from) => {
  const { $i18n } = useNuxtApp();
  const { user } = useAuth();
  const applied = useState<string | null>(
    'cardan-auth:profile-locale',
    () => null,
  );

  const resolved = resolveLocale({
    route: to,
    user: user.value?.data as Record<string, unknown> | undefined,
    localeFields: useCardanAuthConfig().localeFields,
    locales: $i18n.localeCodes.value,
  });
  if (!resolved) return;

  if (resolved.source === 'profile') {
    const leavingOwnLanguage = !!from.meta.locale && !to.meta.locale;
    if (applied.value && !leavingOwnLanguage) return;
    applied.value = resolved.locale;
  }

  if ($i18n.locale.value !== resolved.locale) {
    await $i18n.setLocale(resolved.locale as typeof $i18n.locale.value);
  }
});
