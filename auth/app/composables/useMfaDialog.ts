/** Opens the two MFA dialogs in the right flow. */
export function useMfaDialog() {
  const { mfaStep, mfaError, recoveryCodes, resetMfa } = useMfa();
  const { isPasswordConfirmed, requestPasswordConfirmation } =
    usePasswordConfirmation();

  const loadingMfaRecoveryCodesDialog = useState(
    'loadingMfaRecoveryCodesDialog',
    () => false,
  );

  const loadingMfaDisableDialog = useState(
    'loadingMfaDisableDialog',
    () => false,
  );

  const {
    dialogRef: mfaDialogRef,
    open: openMfaDialog,
    close: closeMfaDialog,
  } = useLayerDialog('auth:mfa');

  const {
    dialogRef: mfaRecoveryCodesDialogRef,
    open: openRecoveryCodesDialog,
    close: closeMfaRecoveryCodesDialog,
  } = useLayerDialog('auth:mfa-recovery-codes');

  /** Opens the dialog on the intro of turning MFA on. */
  function openMfaEnableDialog() {
    resetMfa();
    openMfaDialog();
  }

  /** Opens the dialog on turning MFA off, after the password. */
  async function openMfaDisableDialog() {
    if (loadingMfaDisableDialog.value) return;

    loadingMfaDisableDialog.value = true;
    const confirmed = await isPasswordConfirmed();
    loadingMfaDisableDialog.value = false;

    if (!confirmed && !(await requestPasswordConfirmation())) return;
    resetMfa();
    mfaStep.value = 5;
    openMfaDialog();
  }

  /** Opens the dialog on replacing the recovery codes, after the password. */
  async function openMfaRecoveryCodesDialog() {
    loadingMfaRecoveryCodesDialog.value = true;
    const confirmed = await isPasswordConfirmed();
    loadingMfaRecoveryCodesDialog.value = false;

    if (!confirmed && !(await requestPasswordConfirmation())) return;

    recoveryCodes.value = [];
    mfaError.value = null;
    openRecoveryCodesDialog();
  }

  return {
    mfaDialogRef,
    mfaRecoveryCodesDialogRef,
    loadingMfaRecoveryCodesDialog,
    loadingMfaDisableDialog,
    openMfaEnableDialog,
    openMfaDisableDialog,
    closeMfaDialog,
    openMfaRecoveryCodesDialog,
    closeMfaRecoveryCodesDialog,
  };
}
