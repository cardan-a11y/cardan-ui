// The profile's language after a sign-in or a save that changes it; the
// `01.locale` middleware applies it on navigation
export default defineNuxtPlugin({
  name: 'cardan-auth:profile-locale',

  setup(nuxtApp) {
    const { user } = useSanctumAuth<{ data: AuthUser }>();
    const { apply } = useProfileLocale();
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

      await apply(value);
    });
  },
});
