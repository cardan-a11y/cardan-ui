/**
 * Opens the sign-out confirmation. Mount `<LogoutDialog />` once, in your
 * layout, and open it with `logoutDialogRef.value?.openDialog()`.
 */
export function useLogoutDialog() {
  const nuxtApp = useNuxtApp();
  const { logout, isAuthenticated } = useAuth();

  const { dialogRef: logoutDialogRef, close: closeDialog } =
    useLayerDialog('auth:logout');

  /** Signs out, then closes the dialog; throws when the API refuses. */
  async function handleLogout() {
    // nuxt-auth-sanctum (3.1.5) throws on `logout()` without a session.
    // Tripwire: test/tripwires.test.ts.
    if (isAuthenticated.value) {
      const unhook = nuxtApp.hook('sanctum:logout', closeDialog);
      try {
        await logout();
      } finally {
        unhook();
      }
    }

    await closeDialog();
  }

  return {
    logoutDialogRef,
    handleLogout,
  };
}
