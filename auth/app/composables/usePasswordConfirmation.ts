/**
 * Settles the confirmation the dialog is open for. Module scope rather than
 * `useState`: a function is not state, and there is only ever one dialog.
 */
let settlePending: ((confirmed: boolean) => void) | null = null;

/**
 * Work to finish before the dialog closes, under its Confirm button's loading
 * state (see `requestPasswordConfirmation`).
 */
let pendingAfterConfirm: (() => Promise<unknown>) | null = null;

/**
 * Fortify's password confirmation (`confirmPassword` on a feature): routes
 * behind `password.confirm` answer 423 until the user has re-entered their
 * password, which then holds for the app's `auth.password_timeout`.
 *
 * Mount `PasswordConfirmationDialog` once, then either check up front with
 * `ensurePasswordConfirmed()` before opening a flow, or wrap a request in
 * `withPasswordConfirmation()` to ask only when Fortify does.
 */
export function usePasswordConfirmation() {
  const { client } = useAuth();
  const { endpoints } = useCardanAuthConfig();

  const passwordConfirmationDialogRef = useState<DialogComponent | null>(
    'passwordConfirmationDialogRef',
    () => null,
  );

  const passwordConfirmationError = useState<AuthErrorData | null>(
    'passwordConfirmationError',
    () => null,
  );

  const loadingPasswordConfirmation = useState(
    'loadingPasswordConfirmation',
    () => false,
  );

  /**
   * Counts the confirmations asked for. The dialog keys its form on it, so
   * every request gets a fresh password field: a browser autofills a field it
   * has not seen before, not one it filled earlier and a script then cleared,
   * and the form's autofocus runs on mount.
   */
  const passwordConfirmationRequest = useState(
    'passwordConfirmationRequest',
    () => 0,
  );

  function settle(confirmed: boolean) {
    const settlePendingConfirmation = settlePending;
    settlePending = null;
    pendingAfterConfirm = null;
    settlePendingConfirmation?.(confirmed);
  }

  /**
   * Opens the dialog and resolves once the user confirmed (true) or closed it
   * (false).
   *
   * `afterConfirm` runs once the password is accepted, before the dialog
   * closes, with its Confirm button still loading: for the request the
   * confirmation was for, so the user sees one action in progress rather than
   * a closed dialog and nothing happening yet.
   */
  function requestPasswordConfirmation(
    afterConfirm?: () => Promise<unknown>,
  ): Promise<boolean> {
    // Only one confirmation is open at a time: an earlier one that is still
    // waiting is answered as cancelled.
    settle(false);
    pendingAfterConfirm = afterConfirm ?? null;
    passwordConfirmationError.value = null;
    passwordConfirmationRequest.value++;
    passwordConfirmationDialogRef.value?.openDialog();

    return new Promise((resolve) => {
      settlePending = resolve;
    });
  }

  async function isPasswordConfirmed() {
    try {
      const status = await client<{ confirmed?: boolean }>(
        endpoints.confirmedPasswordStatus,
      );
      return !!status?.confirmed;
    } catch {
      return false;
    }
  }

  /** Resolves true right away when the session is still confirmed; asks otherwise. */
  async function ensurePasswordConfirmed() {
    if (await isPasswordConfirmed()) return true;
    return await requestPasswordConfirmation();
  }

  /**
   * Posts the password. On success it runs the request's `afterConfirm`, then
   * closes the dialog and lets the waiting caller continue.
   */
  async function confirmPassword(password: string) {
    passwordConfirmationError.value = null;
    loadingPasswordConfirmation.value = true;

    try {
      await client(endpoints.confirmPassword, {
        method: 'POST',
        body: { password },
      });
    } catch (error) {
      passwordConfirmationError.value = extractAuthError(error);
      loadingPasswordConfirmation.value = false;
      return false;
    }

    try {
      // Its own errors are the caller's to show, once the dialog is closed.
      await pendingAfterConfirm?.();
    } catch {
      // Nothing to show here: the password itself was accepted.
    } finally {
      settle(true);
      passwordConfirmationDialogRef.value?.closeDialog();
      loadingPasswordConfirmation.value = false;
    }

    return true;
  }

  /** The dialog closed without a confirmation. */
  function cancelPasswordConfirmation() {
    settle(false);
  }

  /**
   * Runs `request`, and when Fortify answers 423 asks for the password and runs
   * it once more. A cancelled confirmation rethrows the 423, which
   * `isPasswordConfirmationRequired()` recognises.
   */
  async function withPasswordConfirmation<T>(
    request: () => Promise<T>,
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (!isPasswordConfirmationRequired(error)) throw error;
      if (!(await requestPasswordConfirmation())) throw error;

      return await request();
    }
  }

  return {
    passwordConfirmationDialogRef,
    passwordConfirmationError,
    loadingPasswordConfirmation,
    passwordConfirmationRequest,
    isPasswordConfirmed,
    ensurePasswordConfirmed,
    requestPasswordConfirmation,
    confirmPassword,
    cancelPasswordConfirmation,
    withPasswordConfirmation,
  };
}
