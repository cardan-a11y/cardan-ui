// The profile's language after a sign-in or a save that changes it; the
// `01.locale` middleware applies it on navigation
export default defineNuxtPlugin({
  name: 'cardan-auth:profile-locale',

  setup(nuxtApp) {
    const { user } = useSanctumAuth<{ data: AuthUser }>();
    const applied = useState<string | null>(
      'cardan-auth:profile-locale',
      () => null,
    );

    // The object, not the field: a profile form edits the field in place
    watch(user, async (value) => {
      if (!value) {
        applied.value = null;
        return;
      }

      // During the first navigation `currentRoute` is still the start location
      await nuxtApp.$router.isReady().catch(() => {});
      if (user.value !== value) return;

      const { $i18n } = nuxtApp;
      const resolved = resolveLocale({
        route: nuxtApp.$router.currentRoute.value,
        user: value.data as Record<string, unknown>,
        localeFields: useCardanAuthConfig().localeFields,
        locales: $i18n.localeCodes.value,
      });
      if (resolved?.source !== 'profile' || resolved.locale === applied.value) {
        return;
      }

      applied.value = resolved.locale;
      if ($i18n.locale.value !== resolved.locale) {
        await $i18n.setLocale(resolved.locale as typeof $i18n.locale.value);
      }
    });
  },
});
