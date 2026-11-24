// Module scope, not `useState`: a function is not state
let settlePending: ((confirmed: boolean) => void) | null = null;

let pendingAfterConfirm: (() => Promise<unknown>) | null = null;

let confirmedPending = false;

const mountedDialogs: DialogComponent[] = [];

/**
 * Fortify's password confirmation: routes behind `password.confirm` answer 423
 * until the password is re-entered. With `PasswordConfirmationDialog` mounted,
 * check up front with `ensurePasswordConfirmed()`, or wrap a request in
 * `withPasswordConfirmation()` to ask only when Fortify does.
 */
export function usePasswordConfirmation() {
  const { client } = useAuth();
  const { endpoints } = useCardanAuthConfig();

  const {
    dialogRef: passwordConfirmationDialogRef,
    open: openPasswordConfirmationDialog,
    close: closePasswordConfirmationDialog,
  } = useLayerDialog('auth:password-confirmation');

  const passwordConfirmationError = useState<ApiErrorData | null>(
    'passwordConfirmationError',
    () => null,
  );

  const loadingPasswordConfirmation = useState(
    'loadingPasswordConfirmation',
    () => false,
  );

  /** Counts the confirmations asked for; the dialog keys its form on it. */
  const passwordConfirmationRequest = useState(
    'passwordConfirmationRequest',
    () => 0,
  );

  /** The stack hands over on purpose: not the second binding useDialog warns of */
  function handOverTo(dialog: DialogComponent | null) {
    passwordConfirmationDialogRef.value = null;
    passwordConfirmationDialogRef.value = dialog;
  }

  function registerPasswordConfirmationDialog(dialog: DialogComponent) {
    mountedDialogs.push(dialog);
    handOverTo(dialog);
  }

  function unregisterPasswordConfirmationDialog(dialog: DialogComponent) {
    const index = mountedDialogs.lastIndexOf(dialog);
    if (index !== -1) mountedDialogs.splice(index, 1);
    handOverTo(mountedDialogs.at(-1) ?? null);
  }

  function settle(confirmed: boolean) {
    const settlePendingConfirmation = settlePending;
    settlePending = null;
    pendingAfterConfirm = null;
    confirmedPending = false;
    settlePendingConfirmation?.(confirmed);
  }

  /**
   * Opens the dialog; resolves true once confirmed, false once closed, and
   * rejects when no dialog is mounted. `afterConfirm` runs before the dialog
   * closes, under its busy Confirm button.
   */
  function requestPasswordConfirmation(
    afterConfirm?: () => Promise<unknown>,
  ): Promise<boolean> {
    settle(false);

    if (!passwordConfirmationDialogRef.value) {
      const error = new Error(
        'No PasswordConfirmationDialog is mounted: mount it once, in the layout or with the flow that needs the password',
      );
      console.error(error);
      return Promise.reject(error);
    }

    pendingAfterConfirm = afterConfirm ?? null;
    passwordConfirmationError.value = null;
    passwordConfirmationRequest.value++;
    openPasswordConfirmationDialog();

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

  /** Posts the password; on success runs `afterConfirm`, then closes the dialog. */
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
      await pendingAfterConfirm?.();
    } catch {
      // Its errors are the caller's to show; the password was accepted
    } finally {
      confirmedPending = true;
      void closePasswordConfirmationDialog();
      loadingPasswordConfirmation.value = false;
    }

    return true;
  }

  function passwordConfirmationDialogClosed() {
    settle(confirmedPending);
  }

  /**
   * Runs `request`; on a 423 asks for the password and runs it once more. A
   * cancelled confirmation rethrows the 423 (`isPasswordConfirmationRequired()`).
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
