/**
 * Settles the confirmation the dialog is open for. Module scope rather than
 * `useState`: a function is not state, and only one confirmation is open at
 * a time.
 */
let settlePending: ((confirmed: boolean) => void) | null = null;

/**
 * Work to finish before the dialog closes, under its Confirm button's loading
 * state (see `requestPasswordConfirmation`).
 */
let pendingAfterConfirm: (() => Promise<unknown>) | null = null;

/**
 * Whether the password was accepted for the confirmation the dialog is
 * closing for, see `confirmPassword`.
 */
let confirmedPending = false;

/**
 * The mounted dialogs, the last one on top. `MfaSettings` and `MfaSetup`
 * bring their own, and an app mounts one in its layout for its own flows, so
 * two can be mounted at once: the one mounted last answers, and unmounting it
 * hands back to the other. Only the client mounts.
 */
const mountedDialogs: DialogComponent[] = [];

/**
 * Fortify's password confirmation (`confirmPassword` on a feature): routes
 * behind `password.confirm` answer 423 until the user has re-entered their
 * password, which then holds for the app's `auth.password_timeout`.
 *
 * With `PasswordConfirmationDialog` mounted, either check up front with
 * `ensurePasswordConfirmed()` before opening a flow, or wrap a request in
 * `withPasswordConfirmation()` to ask only when Fortify does.
 */
export function usePasswordConfirmation() {
  const { client } = useAuth();
  const { endpoints } = useCardanAuthConfig();

  /** The dialog that answers: the one mounted last */
  const passwordConfirmationDialogRef = useState<DialogComponent | null>(
    'passwordConfirmationDialogRef',
    () => null,
  );

  const passwordConfirmationError = useState<ApiErrorData | null>(
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

  function registerPasswordConfirmationDialog(dialog: DialogComponent) {
    mountedDialogs.push(dialog);
    passwordConfirmationDialogRef.value = dialog;
  }

  function unregisterPasswordConfirmationDialog(dialog: DialogComponent) {
    const index = mountedDialogs.lastIndexOf(dialog);
    if (index !== -1) mountedDialogs.splice(index, 1);
    passwordConfirmationDialogRef.value = mountedDialogs.at(-1) ?? null;
  }

  function settle(confirmed: boolean) {
    const settlePendingConfirmation = settlePending;
    settlePending = null;
    pendingAfterConfirm = null;
    confirmedPending = false;
    settlePendingConfirmation?.(confirmed);
  }

  /**
   * Opens the dialog and resolves once the user confirmed (true) or closed it
   * (false), with the dialog closed either way. Rejects when no dialog is
   * mounted: a caller that would otherwise wait forever.
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

    if (!passwordConfirmationDialogRef.value) {
      // A mistake in the app, loud in the console: nothing can ask for the
      // password, so the flow that needs it stops with an error instead of
      // hanging on a loading button
      const error = new Error(
        'No PasswordConfirmationDialog is mounted: mount it once, in the layout or with the flow that needs the password',
      );
      console.error(error);
      return Promise.reject(error);
    }

    pendingAfterConfirm = afterConfirm ?? null;
    passwordConfirmationError.value = null;
    passwordConfirmationRequest.value++;
    passwordConfirmationDialogRef.value.openDialog();

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
   * closes the dialog, and the waiting caller continues once it has closed.
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
      passwordConfirmationError.value = extractApiError(error);
      loadingPasswordConfirmation.value = false;
      return false;
    }

    try {
      // Its own errors are the caller's to show, once the dialog is closed.
      await pendingAfterConfirm?.();
    } catch {
      // Nothing to show here: the password itself was accepted.
    } finally {
      // Settled from the dialog's close event, once it is gone: the page
      // behind a modal is inert, so what the caller does next, such as moving
      // focus to the step the password was for, would not land while the
      // dialog is still closing
      confirmedPending = true;
      passwordConfirmationDialogRef.value?.closeDialog();
      loadingPasswordConfirmation.value = false;
    }

    return true;
  }

  /** The dialog has closed: answers the confirmation it was open for. */
  function passwordConfirmationDialogClosed() {
    settle(confirmedPending);
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
    registerPasswordConfirmationDialog,
    unregisterPasswordConfirmationDialog,
    isPasswordConfirmed,
    ensurePasswordConfirmed,
    requestPasswordConfirmation,
    confirmPassword,
    passwordConfirmationDialogClosed,
    withPasswordConfirmation,
  };
}
