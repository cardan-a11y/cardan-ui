/**
 * Opens the sign-out confirmation. Mount `<LogoutDialog />` once, in your
 * layout, and open it with `logoutDialogRef.value?.openDialog()`.
 */
export function useLogoutDialog() {
  const { logout, isAuthenticated } = useAuth();

  const logoutDialogRef = useState<DialogComponent | null>(
    'logoutDialog',
    () => null,
  );

  /**
   * Signs out and closes the dialog once that is done. A sign-out the API
   * refuses throws, so the dialog stays open with the error and the user
   * knows they are still signed in.
   */
  async function handleLogout() {
    // Nothing to end: a session that already expired. nuxt-auth-sanctum
    // refuses to sign out then; the dialog has done its job.
    if (isAuthenticated.value) await logout();
    logoutDialogRef.value?.closeDialog();
  }

  return {
    logoutDialogRef,
    handleLogout,
  };
}
