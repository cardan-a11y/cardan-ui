type NuxtApp = ReturnType<typeof useNuxtApp>;

const switchInProgress = new WeakMap<NuxtApp, Promise<void>>();

/**
 * The profile's language, which the layer applies itself after a sign-in and
 * a save that changes it (`plugins/profile-locale.client.ts`). `apply()` is
 * for a page that shows a text in the new language right after a save, such
 * as a toast: the layer's watcher switches later.
 */
export function useProfileLocale() {
  const nuxtApp = useNuxtApp();
  const { user } = useSanctumAuth<{ data: AuthUser }>();
  const applied = useState<string | null>(
    'cardan-auth:profile-locale',
    () => null,
  );

  /**
   * Applies the profile's language when it differs from the one the layer
   * applied last, and resolves once the interface shows it, also when the
   * watcher started that switch. A language switched by hand stays, as with
   * the watcher. Call it once the app has started, after
   * `refreshIdentity()`; route middleware has `01.locale` for this.
   */
  async function apply(value = user.value): Promise<void> {
    if (!value) return;

    const { $i18n, $router } = nuxtApp;
    const resolved = resolveLocale({
      route: $router.currentRoute.value,
      user: value.data as Record<string, unknown>,
      localeFields: useCardanAuthConfig().localeFields,
      locales: $i18n.localeCodes.value,
    });
    if (resolved?.source !== 'profile') return;
    if (resolved.locale === applied.value) {
      return switchInProgress.get(nuxtApp);
    }

    applied.value = resolved.locale;
    if ($i18n.locale.value === resolved.locale) return;

    const done = $i18n.setLocale(resolved.locale as typeof $i18n.locale.value);
    const settle = () => {
      if (switchInProgress.get(nuxtApp) === done) {
        switchInProgress.delete(nuxtApp);
      }
    };
    switchInProgress.set(nuxtApp, done);
    done.then(settle, settle);
    await done;
  }

  return { apply };
}
