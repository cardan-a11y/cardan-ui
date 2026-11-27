type CookieConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

/**
 * The cookie consent CookiesDialog collects and applies, shared by every caller.
 * CookiesDialog registers Google Tag Manager with `runtimeConfig.public.gtmId`;
 * a project never registers it itself (a second `useScriptGoogleTagManager()`
 * loads it before any consent) and sends its own events with `pushDataLayer()`.
 */
export function useCookiesDialog() {
  const { gtmId } = useRuntimeConfig().public;

  /** Whether CookiesDialog is open: set it and the dialog follows */
  const cookiesDialogOpen = useState<boolean>(
    'cardan-ui:cookies-dialog-open',
    () => false,
  );

  const cookieConsent = useState<CookieConsent>(
    'cardan-ui:cookie-consent',
    () => ({
      necessary: false,
      analytics: false,
      marketing: false,
    }),
  );

  const consentCookie = useCookie<CookieConsent | null>('cookieConsent', {
    maxAge: 60 * 60 * 24 * 365,
  });

  const hasConsent = computed(
    () => cookieConsent.value?.analytics && cookieConsent.value?.marketing,
  );

  function openCookiesDialog() {
    cookiesDialogOpen.value = true;
  }

  function saveConsent(granted: boolean) {
    const consent = { necessary: true, analytics: granted, marketing: granted };

    consentCookie.value = consent;
    cookieConsent.value = { ...consent };

    cookiesDialogOpen.value = false;
  }

  /**
   * Pushes an event to Tag Manager's data layer, only once the visitor has
   * accepted, and only with a gtmId; before that, or after a Deny, it is dropped
   */
  function pushDataLayer(event: Record<string, unknown>) {
    if (!import.meta.client || !gtmId || !hasConsent.value) return;

    const page = window as unknown as { dataLayer?: unknown[] };
    page.dataLayer ??= [];
    page.dataLayer.push(event);
  }

  function acceptCookies() {
    saveConsent(true);
  }

  function denyCookies() {
    saveConsent(false);
  }

  return {
    cookieConsent,
    consentCookie,
    cookiesDialogOpen,
    hasConsent,
    openCookiesDialog,
    pushDataLayer,
    acceptCookies,
    denyCookies,
  };
}
