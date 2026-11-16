/**
 * Drives the Laravel Fortify two-factor endpoints and holds the shared state
 * the MFA components render.
 *
 * State is kept in `useState` so every component in the flow (the dialog, its
 * steps, the challenge page) reads the same instance without prop drilling.
 */
export function useMfa() {
  const { client, refreshIdentity, loginRedirectTarget } = useAuth();
  const { withPasswordConfirmation } = usePasswordConfirmation();
  const { endpoints } = useCardanAuthConfig();
  const { createToast } = useToast();
  // Not `useI18n()`: that needs a component, and the challenge and setup
  // pages are not the only callers
  const { $i18n } = useNuxtApp();

  const mfaStep = useState<MfaStep>('mfaStep', () => 1);
  const qrCode = useState('qrCode', () => '');
  /** The `otpauth://` link the QR code holds: opens an authenticator app. */
  const qrCodeUrl = useState('qrCodeUrl', () => '');
  const recoveryCodes = useState<string[]>('recoveryCodes', () => []);
  const mfaError = useState<ApiErrorData | null>('mfaError', () => null);

  const mfaCredentials = useState<MfaCredentials>('mfaCredentials', () => ({
    code: '',
    recovery_code: '',
  }));

  const loadingGenerateRecoveryCodes = useState(
    'loadingGenerateRecoveryCodes',
    () => false,
  );

  const loadingConfirmationCode = useState(
    'loadingConfirmationCode',
    () => false,
  );

  const loadingSolveMfaChallenge = useState(
    'loadingSolveMfaChallenge',
    () => false,
  );

  const loadingDisableMfa = useState('loadingDisableMfa', () => false);

  const codeInputRef = useState<InputComponent | null>(
    'codeInputRef',
    () => null,
  );

  const recoveryCodeInputRef = useState<InputComponent | null>(
    'recoveryCodeInputRef',
    () => null,
  );

  function setMfaError(error: unknown) {
    // A password confirmation the user closed is their choice, not an error.
    if (isPasswordConfirmationRequired(error)) return;
    mfaError.value = extractApiError(error);
  }

  /**
   * Fortify's two-factor settings routes sit behind `password.confirm` when the
   * app turns `confirmPassword` on; ask for the password when they say so.
   */
  function settingsRequest<T>(
    url: string,
    options?: Parameters<typeof client<T>>[1],
  ): Promise<T> {
    return withPasswordConfirmation(() => client<T>(url, options));
  }

  /**
   * Re-reads the identity after a change the API has made. A read that fails
   * leaves the old identity and does not make the change a failure: reported
   * as one, a retry would repeat what is done already (a spent challenge).
   */
  async function refreshIdentityAfterChange() {
    try {
      await refreshIdentity();
    } catch {
      // The next read of the identity catches up.
    }
  }

  /**
   * Clears every trace of a flow: on closing a dialog, on leaving the setup
   * page and once the challenge is solved, so nothing of an abandoned
   * enrolment, its recovery codes above all, survives into the next one.
   */
  function resetMfa() {
    mfaStep.value = 1;
    qrCode.value = '';
    qrCodeUrl.value = '';
    recoveryCodes.value = [];
    mfaError.value = null;
    loadingConfirmationCode.value = false;
    loadingSolveMfaChallenge.value = false;
    loadingDisableMfa.value = false;
    loadingGenerateRecoveryCodes.value = false;
    mfaCredentials.value = {
      code: '',
      recovery_code: '',
    };
  }

  /**
   * Reads the codes: the list the API serves, empty once it no longer does.
   * Null when the request failed, with the error set, unless the user closed
   * the password dialog, which is their choice.
   */
  async function getRecoveryCodes(): Promise<string[] | null> {
    mfaError.value = null;

    try {
      const codes =
        (await settingsRequest<string[]>(endpoints.twoFactorRecoveryCodes)) ??
        [];
      if (codes.length) recoveryCodes.value = codes;
      return codes;
    } catch (error) {
      setMfaError(error);
      return null;
    }
  }

  async function generateRecoveryCodes() {
    mfaError.value = null;
    loadingGenerateRecoveryCodes.value = true;

    try {
      await settingsRequest(endpoints.twoFactorRecoveryCodes, {
        method: 'POST',
      });
      // Read once, right away: the API serves the new codes this one time and
      // an empty list after that.
      const codes = await getRecoveryCodes();

      // The old codes are gone already, so an empty answer is not silence: a
      // failed request has set the error, an empty one gets one here.
      if (codes && !codes.length) {
        mfaError.value = {
          message: $i18n.t('mfa.recovery-codes-regenerate-unavailable'),
        };
      }
    } catch (error) {
      setMfaError(error);
    } finally {
      loadingGenerateRecoveryCodes.value = false;
    }
  }

  async function enableMfa() {
    mfaError.value = null;

    try {
      await settingsRequest(endpoints.twoFactorAuthentication, {
        method: 'POST',
      });
      mfaStep.value = 2;
    } catch (error) {
      setMfaError(error);
      return;
    }

    await refreshIdentityAfterChange();
  }

  /**
   * Turns MFA off and moves on to the result step. With `showResult: false`
   * the flow stays where it is and keeps loading, for a caller that leaves
   * right away (closing the dialog resets it).
   */
  async function disableMfa({ showResult = true } = {}) {
    mfaError.value = null;
    loadingDisableMfa.value = true;

    try {
      await settingsRequest(endpoints.twoFactorAuthentication, {
        method: 'DELETE',
      });
    } catch (error) {
      setMfaError(error);
      loadingDisableMfa.value = false;
      return false;
    }

    if (showResult) mfaStep.value = 6;
    await refreshIdentityAfterChange();
    if (showResult) loadingDisableMfa.value = false;
    return true;
  }

  async function getQrCode() {
    mfaError.value = null;

    try {
      const data = await settingsRequest<{ svg?: string; url?: string }>(
        endpoints.twoFactorQrCode,
      );
      // Inlined as markup by `MfaQr`, so only a QR code gets through
      if (data?.svg) qrCode.value = sanitizeQrSvg(data.svg);
      if (data?.url) qrCodeUrl.value = data.url;
    } catch (error) {
      setMfaError(error);
    }
  }

  async function enterCode() {
    mfaError.value = null;
    loadingConfirmationCode.value = true;

    try {
      // Fetched before confirming, shown after: Fortify creates the codes when
      // MFA is enabled and confirming keeps them. A backend may end a
      // confirmation that only covered setting MFA up (one that came from
      // signing in) once it is confirmed, and the codes still belong to this
      // enrolment. This is the one read of the codes that the setup gets.
      const codes = await getRecoveryCodes();

      // Without them the enrolment stops here, on the code step: confirming
      // would turn MFA on with codes the user never gets to see. A failed
      // request has set the error already; an empty answer gets one here.
      if (!codes?.length) {
        if (codes) {
          mfaError.value = {
            message: $i18n.t('mfa.recovery-codes-unavailable'),
          };
        }
        return false;
      }

      await settingsRequest(endpoints.twoFactorConfirmation, {
        method: 'POST',
        body: mfaCredentials.value,
      });
      mfaStep.value = 4;
      return true;
    } catch (error) {
      setMfaError(error);
      return false;
    } finally {
      loadingConfirmationCode.value = false;
    }
  }

  /**
   * Completes the second factor at sign-in and continues to wherever the
   * interrupted login was headed, following the app's Sanctum redirect config.
   */
  async function solveMfaChallenge() {
    mfaError.value = null;
    loadingSolveMfaChallenge.value = true;

    // Both read before the request: on a 401, nuxt-auth-sanctum may navigate
    // before this function gets the answer, and the route is then another
    const route = useRoute();
    const redirect = loginRedirectTarget(route);
    const requestedRedirect = route.query.redirect;

    try {
      await client(endpoints.twoFactorChallenge, {
        method: 'POST',
        body: mfaCredentials.value,
      });
    } catch (error) {
      if (isUnauthenticated(error)) {
        // The sign-in this challenge belonged to has expired: Fortify no
        // longer knows whose code this is. Back to the login page, with where
        // the user was headed and a word on why. nuxt-auth-sanctum's own 401
        // handling only knows to go to `redirect.onAuthOnly`, without either.
        resetMfa();
        createToast({
          label: $i18n.t('mfa.session-expired'),
          color: 'orange',
        });
        await navigateTo({
          path: '/login',
          query: { redirect: requestedRedirect },
        });
        return;
      }

      setMfaError(error);
      loadingSolveMfaChallenge.value = false;
      return;
    }

    // The code is spent: from here on nothing asks for it again
    try {
      await refreshIdentityAfterChange();
      if (redirect !== false) await navigateTo(redirect);
      resetMfa();
    } finally {
      loadingSolveMfaChallenge.value = false;
    }
  }

  /**
   * The secret in the QR code, for typing into an authenticator app that
   * cannot scan it. Read from the link, so it always matches the code.
   */
  const setupKey = computed(() => {
    if (!qrCodeUrl.value) return '';

    try {
      return new URL(qrCodeUrl.value).searchParams.get('secret') ?? '';
    } catch {
      return '';
    }
  });

  return {
    mfaStep,
    mfaCredentials,
    mfaError,
    qrCode,
    qrCodeUrl,
    setupKey,
    recoveryCodes,
    loadingConfirmationCode,
    loadingSolveMfaChallenge,
    loadingDisableMfa,
    loadingGenerateRecoveryCodes,
    codeInputRef,
    recoveryCodeInputRef,
    getRecoveryCodes,
    generateRecoveryCodes,
    resetMfa,
    enableMfa,
    disableMfa,
    getQrCode,
    enterCode,
    solveMfaChallenge,
  };
}
