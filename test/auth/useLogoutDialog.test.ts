import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick, ref } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useLogoutDialog, useNuxtApp } from '#imports';

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
function dialog(openDialog = vi.fn()) {
  const { logoutDialogRef } = useLogoutDialog();
  const closeDialog = vi.fn();
  logoutDialogRef.value = {
    openDialog,
    closeDialog,
  } as unknown as DialogComponent;
  return closeDialog;
}

describe('useLogoutDialog', () => {
  beforeEach(() => {
    logout.mockReset();
    isAuthenticated.value = true;
    useLogoutDialog().logoutDialogRef.value = null;
  });

  it('open() opens the dialog one task later, once a closing menu has handed focus back', async () => {
    // A menu that hands focus back in a microtask, like UserMenu's hideMenu()
    let focusBack = false;
    const openDialog = vi.fn(() => focusBack);
    dialog(openDialog);
    queueMicrotask(() => (focusBack = true));

    const opened = useLogoutDialog().open();
    await nextTick();
    expect(openDialog).not.toHaveBeenCalled();

    await opened;
    expect(openDialog).toHaveBeenCalledOnce();
    expect(openDialog).toHaveReturnedWith(true);
  });

  it('open() resolves without a mounted dialog', async () => {
    await expect(useLogoutDialog().open()).resolves.toBeUndefined();
  });

  it('signs out, then closes the dialog', async () => {
    const closeDialog = dialog();
    let signedOut = false;
    logout.mockImplementation(async () => {
      expect(closeDialog).not.toHaveBeenCalled();
      signedOut = true;
    });

    await useLogoutDialog().handleLogout();

    expect(signedOut).toBe(true);
    expect(closeDialog).toHaveBeenCalledOnce();
  });

  it('closes the dialog before nuxt-auth-sanctum leaves the page', async () => {
    const steps: string[] = [];
    const closeDialog = dialog();
    closeDialog.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      steps.push('closed');
    });
    logout.mockImplementation(async () => {
      await useNuxtApp().callHook('sanctum:logout');
      steps.push('redirect');
    });

    await useLogoutDialog().handleLogout();

    expect(steps.slice(0, 2)).toEqual(['closed', 'redirect']);
  });

  it('leaves the hook after signing out, so a later sign-out elsewhere does not close it', async () => {
    const closeDialog = dialog();
    await useLogoutDialog().handleLogout();
    closeDialog.mockClear();

    await useNuxtApp().callHook('sanctum:logout');

    expect(closeDialog).not.toHaveBeenCalled();
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
