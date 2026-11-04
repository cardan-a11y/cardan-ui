/**
 * The Auth UI layer's useLogoutDialog, without signing out: the playground
 * shows the LogoutDialog only to see it, so Sign out just closes it. The
 * playground's own composables take priority over the layers' of the same name.
 * The tests run in the playground too, so a LogoutDialog test gets this one.
 */
export function useLogoutDialog() {
  const logoutDialogRef = useState<DialogComponent | null>(
    'logoutDialog',
    () => null,
  );

  function handleLogout() {
    logoutDialogRef.value?.closeDialog();
  }

  return {
    logoutDialogRef,
    handleLogout,
  };
}
