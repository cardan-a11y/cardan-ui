/**
 * Opens the sign-out confirmation. Mount `<LogoutDialog />` once, in your
 * layout, and open it from anywhere with `useLogoutDialog().open()`, also
 * from a menu item: close the menu first (UserMenu's `hideMenu()`).
 */
export function useLogoutDialog() {
  const nuxtApp = useNuxtApp();
  const { logout, isAuthenticated } = useAuth();

  const {
    dialogRef: logoutDialogRef,
    open: openDialog,
    close: closeDialog,
  } = useLayerDialog('auth:logout');

  /**
   * Opens the dialog one task later, once a closing menu has handed focus
   * back to its trigger: the dialog returns focus where it was when it
   * opened. Resolves once it is open; without a mounted dialog it does
   * nothing (development warns).
   */
  function open(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        openDialog();
        resolve();
      });
    });
  }

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
    open,
    handleLogout,
  };
}
