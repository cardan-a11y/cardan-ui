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

  const mfaStep = useState<MfaStep>('mfaStep', () => 1);
  const qrCode = useState('qrCode', () => '');
  /** The `otpauth://` link the QR code holds: opens an authenticator app. */
  const qrCodeUrl = useState('qrCodeUrl', () => '');
  const recoveryCodes = useState<string[]>('recoveryCodes', () => []);
  const mfaError = useState<AuthErrorData | null>('mfaError', () => null);

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
    mfaError.value = extractAuthError(error);
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

  function resetMfa() {
    mfaStep.value = 1;
    qrCode.value = '';
    qrCodeUrl.value = '';
    mfaError.value = null;
    loadingConfirmationCode.value = false;
    loadingSolveMfaChallenge.value = false;
    loadingDisableMfa.value = false;
    mfaCredentials.value = {
      code: '',
      recovery_code: '',
    };
  }

  async function getRecoveryCodes() {
    mfaError.value = null;

    try {
      const codes = await settingsRequest<string[]>(
        endpoints.twoFactorRecoveryCodes,
      );
      if (codes?.length) recoveryCodes.value = codes;
    } catch (error) {
      setMfaError(error);
    }
  }

  async function generateRecoveryCodes() {
    mfaError.value = null;
    loadingGenerateRecoveryCodes.value = true;

    try {
      await settingsRequest(endpoints.twoFactorRecoveryCodes, {
        method: 'POST',
      });
      await getRecoveryCodes();
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
      await refreshIdentity();
    } catch (error) {
      setMfaError(error);
    }
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
      if (showResult) mfaStep.value = 6;
      await refreshIdentity();
      if (showResult) loadingDisableMfa.value = false;
      return true;
    } catch (error) {
      setMfaError(error);
      loadingDisableMfa.value = false;
      return false;
    }
  }

  async function getQrCode() {
    mfaError.value = null;

    try {
      const data = await settingsRequest<{ svg?: string; url?: string }>(
        endpoints.twoFactorQrCode,
      );
      if (data?.svg) qrCode.value = data.svg;
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
      // enrolment.
      await getRecoveryCodes();

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

    const redirect = loginRedirectTarget();

    try {
      await client(endpoints.twoFactorChallenge, {
        method: 'POST',
        body: mfaCredentials.value,
      });
      await refreshIdentity();

      if (redirect !== false) await navigateTo(redirect);
    } catch (error) {
      setMfaError(error);
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
