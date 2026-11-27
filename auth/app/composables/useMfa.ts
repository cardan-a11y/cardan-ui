/** Drives Fortify's two-factor endpoints; holds the MFA flow's state, shared by its components. */
export function useMfa() {
  const { client, refreshIdentity, loginRedirectTarget } = useAuth();
  const { withPasswordConfirmation } = usePasswordConfirmation();
  const { endpoints } = useCardanAuthConfig();
  const { createToast } = useToast();
  // Not `useI18n()`: this also runs outside a component's setup
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
    if (isPasswordConfirmationRequired(error)) return;
    mfaError.value = extractApiError(error);
  }

  function settingsRequest<T>(
    url: string,
    options?: Parameters<typeof client<T>>[1],
  ): Promise<T> {
    return withPasswordConfirmation(() => client<T>(url, options));
  }

  async function refreshIdentityAfterChange() {
    try {
      await refreshIdentity();
    } catch {
      // The change is done; the next read of the identity catches up.
    }
  }

  /** Clears every trace of a flow, its recovery codes above all. */
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

  /** The recovery codes the API serves, empty once it no longer does; null when the request failed. */
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
      const codes = await getRecoveryCodes();

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

  /** Turns MFA off; `showResult: false` stays on the step, still loading, for a caller that leaves. */
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
      if (data?.svg) qrCode.value = sanitizeQrSvg(data.svg);
      if (data?.url) qrCodeUrl.value = data.url;
    } catch (error) {
      setMfaError(error);
    }
  }

  /** Confirms the code, then refreshes the identity; true once MFA is on. */
  async function enterCode() {
    mfaError.value = null;
    loadingConfirmationCode.value = true;

    try {
      // Before confirming: a backend may end the password confirmation, and
      // with it the codes route, once MFA is confirmed (stock Fortify does not)
      const codes = await getRecoveryCodes();

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
    } catch (error) {
      setMfaError(error);
      return false;
    } finally {
      loadingConfirmationCode.value = false;
    }

    // The codes first: they never wait on the refresh
    mfaStep.value = 4;
    await refreshIdentityAfterChange();
    return true;
  }

  /** Posts the second factor at sign-in and goes where the sign-in was headed. */
  async function solveMfaChallenge() {
    mfaError.value = null;
    loadingSolveMfaChallenge.value = true;

    // Read before the request: with `redirectIfUnauthenticated` on, the module
    // navigates on a 401 before this gets the answer
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
        // Not nuxt-auth-sanctum's own 401 handling: it gives no reason
        // and loses the redirect the sign-in was headed for
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

    try {
      await refreshIdentityAfterChange();
      if (redirect !== false) await navigateTo(redirect);
      resetMfa();
    } finally {
      loadingSolveMfaChallenge.value = false;
    }
  }

  /** The secret in the QR code, to type into an app that cannot scan it. */
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
