import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useLogoutDialog } from '#imports';

// The session, so a test decides whether there is one and what signing out does
const { logout, isAuthenticated } = vi.hoisted(() => ({
  logout: vi.fn(),
  isAuthenticated: { value: true },
}));
mockNuxtImport('useSanctumAuth', () => () => ({
  user: ref(null),
  isAuthenticated,
  init: vi.fn(),
  login: vi.fn(),
  logout,
  refreshIdentity: vi.fn(),
}));

/** A mounted LogoutDialog, as far as the composable is concerned */
function dialog() {
  const { logoutDialogRef } = useLogoutDialog();
  const closeDialog = vi.fn();
  logoutDialogRef.value = { closeDialog } as unknown as DialogComponent;
  return closeDialog;
}

describe('useLogoutDialog', () => {
  beforeEach(() => {
    logout.mockReset();
    isAuthenticated.value = true;
  });

  it('signs out, then closes the dialog', async () => {
    const closeDialog = dialog();
    let signedOut = false;
    logout.mockImplementation(async () => {
      // Still open while the API works
      expect(closeDialog).not.toHaveBeenCalled();
      signedOut = true;
    });

    await useLogoutDialog().handleLogout();

    expect(signedOut).toBe(true);
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('keeps the dialog open when the API refuses to sign out', async () => {
    const closeDialog = dialog();
    logout.mockRejectedValue(new Error('Server Error'));

    await expect(useLogoutDialog().handleLogout()).rejects.toThrow(
      'Server Error',
    );
    expect(closeDialog).not.toHaveBeenCalled();
  });

  it('only closes the dialog when there is no session to end', async () => {
    const closeDialog = dialog();
    isAuthenticated.value = false;

    await useLogoutDialog().handleLogout();

    expect(logout).not.toHaveBeenCalled();
    expect(closeDialog).toHaveBeenCalledOnce();
  });
});
