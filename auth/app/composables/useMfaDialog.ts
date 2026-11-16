/**
 * Holds the refs to the two MFA dialogs and opens them in the right flow, so
 * consumers never have to know about the dialog's internal step numbers.
 */
export function useMfaDialog() {
  const { mfaStep, mfaError, recoveryCodes, resetMfa } = useMfa();
  const { isPasswordConfirmed, requestPasswordConfirmation } =
    usePasswordConfirmation();

  /**
   * Loading state for whatever opens the recovery codes dialog, while it checks
   * whether the password was confirmed recently.
   */
  const loadingMfaRecoveryCodesDialog = useState(
    'loadingMfaRecoveryCodesDialog',
    () => false,
  );

  /**
   * Loading state for whatever opens the disable dialog, while it checks
   * whether the password was confirmed recently.
   */
  const loadingMfaDisableDialog = useState(
    'loadingMfaDisableDialog',
    () => false,
  );

  const mfaDialogRef = useState<DialogComponent | null>(
    'mfaDialogRef',
    () => null,
  );

  const mfaRecoveryCodesDialogRef = useState<DialogComponent | null>(
    'mfaRecoveryCodesDialogRef',
    () => null,
  );

  /**
   * Opens the dialog on the "turn MFA on" flow: intro → QR → confirm code.
   * The intro opens straight away; `MfaDialog` asks for the password when the
   * user chooses to enable MFA there.
   */
  function openMfaEnableDialog() {
    resetMfa();
    mfaDialogRef.value?.openDialog();
  }

  /**
   * Opens the dialog on the "turn MFA off" confirmation step, after the
   * password. A second click while the check runs starts nothing.
   */
  async function openMfaDisableDialog() {
    if (loadingMfaDisableDialog.value) return;

    loadingMfaDisableDialog.value = true;
    const confirmed = await isPasswordConfirmed();
    loadingMfaDisableDialog.value = false;

    if (!confirmed && !(await requestPasswordConfirmation())) return;
    resetMfa();
    mfaStep.value = 5;
    mfaDialogRef.value?.openDialog();
  }

  function closeMfaDialog() {
    mfaDialogRef.value?.closeDialog();
  }

  /**
   * Opens the dialog on replacing the recovery codes, after the password: the
   * codes are shown only when they are created, so there are none to fetch.
   * A confirmation the user cancels opens nothing.
   */
  async function openMfaRecoveryCodesDialog() {
    loadingMfaRecoveryCodesDialog.value = true;
    const confirmed = await isPasswordConfirmed();
    loadingMfaRecoveryCodesDialog.value = false;

    if (!confirmed && !(await requestPasswordConfirmation())) return;

    // Codes still in memory from setting MFA up are not shown again.
    recoveryCodes.value = [];
    mfaError.value = null;
    mfaRecoveryCodesDialogRef.value?.openDialog();
  }

  function closeMfaRecoveryCodesDialog() {
    mfaRecoveryCodesDialogRef.value?.closeDialog();
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
