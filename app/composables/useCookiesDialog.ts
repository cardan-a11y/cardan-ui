type CookieConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

/** The cookie consent CookiesDialog collects and applies, shared by every caller. */
export function useCookiesDialog() {
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
    acceptCookies,
    denyCookies,
  };
}
