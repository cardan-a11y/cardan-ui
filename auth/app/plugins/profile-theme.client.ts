// The color mode from the profile field `cardanAuth.themeField` names, on every
// new user object; apart from the language's rules
export default defineNuxtPlugin({
  name: 'cardan-auth:profile-theme',

  setup(nuxtApp) {
    const { user } = useSanctumAuth<{ data: AuthUser }>();

    watch(
      user,
      (value) => {
        const { themeField } = useCardanAuthConfig();
        if (!themeField || !value) return;

        const theme = profileField(
          value.data as Record<string, unknown>,
          themeField,
        );
        if (typeof theme !== 'string' || !theme) return;

        // @nuxtjs/color-mode comes from Cardan UI, not this layer: only called with a field named
        nuxtApp.runWithContext(() => {
          useColorMode().preference = theme;
        });
      },
      { immediate: true },
    );
  },
});
