/**
 * Opens the sign-out confirmation. Mount `<LogoutDialog />` once, in your
 * layout, and open it with `logoutDialogRef.value?.openDialog()`.
 */
export function useLogoutDialog() {
  const nuxtApp = useNuxtApp();
  const { logout, isAuthenticated } = useAuth();

  const logoutDialogRef = useState<DialogComponent | null>(
    'logoutDialog',
    () => null,
  );

  const closeDialog = async () => await logoutDialogRef.value?.closeDialog();

  /**
   * Signs out and closes the dialog once that is done. A sign-out the API
   * refuses throws, so the dialog stays open with the error and the user
   * knows they are still signed in.
   */
  async function handleLogout() {
    // Nothing to end: a session that already expired. nuxt-auth-sanctum
    // (3.1.5) throws on `logout()` then; the dialog has done its job.
    if (isAuthenticated.value) {
      // nuxt-auth-sanctum awaits this hook after the API signed out, before
      // it goes to `redirect.onLogout`: the dialog finishes closing on its own
      // page, so its closing frames never show the next one's language
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
