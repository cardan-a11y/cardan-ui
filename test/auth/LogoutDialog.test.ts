import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { LogoutDialog } from '#components';
import { useAuth, useLogoutDialog } from '#imports';
import MfaSetupPage from '../../auth/app/pages/mfa-setup.vue';
import { accessibleName, checkA11y } from '../a11y';
import {
  buttonNamed,
  client,
  fortify,
  navigate,
  pending,
  refuse,
  requests,
  signIn,
  useScenario,
} from './fortify';
import { academy } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const logout = `POST ${academy.sanctum.endpoints.logout}` as const;

/**
 * Signing out through nuxt-auth-sanctum's own `logout()`, from the dialog
 * the layout mounts and from the setup page that cannot be skipped. The
 * composable's own rules are in useLogoutDialog.test.ts.
 */
describe('LogoutDialog (Academy)', () => {
  useScenario(academy);

  async function openDialog() {
    signIn(academy.user());
    const wrapper = await mountSuspended(LogoutDialog, {
      attachTo: document.body,
    });
    useLogoutDialog().logoutDialogRef.value?.openDialog();
    await flushPromises();
    const dialog = wrapper.get('dialog');
    return { dialog, signOut: () => buttonNamed(dialog, 'Sign out') };
  }

  it('asks in a named dialog, busy while the API signs out, and closes', async () => {
    const answer = pending({});
    fortify({ [logout]: answer.handler });
    const { dialog, signOut } = await openDialog();

    expect(accessibleName(dialog)).toBe('Sign out');
    expect(dialog.text()).toContain('Are you sure you want to sign out?');
    expect(await checkA11y()).toHaveNoViolations();

    const button = signOut();
    await button.trigger('click');
    await flushPromises();

    expect(button.attributes('aria-busy')).toBe('true');
    expect(dialog.attributes('open')).toBeDefined();

    answer.answer();
    await flushPromises();

    expect(requests(logout)).toHaveLength(1);
    expect(useAuth().isAuthenticated.value).toBe(false);
    expect(dialog.attributes('open')).toBeUndefined();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('shows a refusal in the alert and stays open, still signed in', async () => {
    fortify({ [logout]: refuse(500) });
    const { dialog, signOut } = await openDialog();

    await signOut().trigger('click');
    await flushPromises();

    expect(dialog.attributes('open')).toBeDefined();
    expect(dialog.get('[role="alert"]').text()).toBe(
      'Something went wrong. Please try again later.',
    );
    expect(signOut().attributes('aria-busy')).toBeUndefined();
    expect(useAuth().isAuthenticated.value).toBe(true);

    // Closed and opened again, it asks afresh
    await buttonNamed(dialog, 'Cancel').trigger('click');
    await flushPromises();
    useLogoutDialog().logoutDialogRef.value?.openDialog();
    await flushPromises();
    expect(dialog.get('[role="alert"]').text()).toBe('');
  });
});

describe('/mfa-setup page (Academy)', () => {
  useScenario(academy);

  async function mountPage(flags: Record<string, unknown>) {
    signIn(academy.user({ mfa_enabled: false, ...flags }));
    return await mountSuspended(MfaSetupPage, {
      route: '/mfa-setup',
      attachTo: document.body,
    });
  }

  it('offers signing out instead of a skip when MFA is required, and shows a refusal', async () => {
    fortify({ [logout]: refuse(500) });
    const wrapper = await mountPage({ mfa_required: true });

    expect(wrapper.get('h1').text()).toBe('Secure your account');
    expect(() => buttonNamed(wrapper, 'Skip for now')).toThrow();

    await buttonNamed(wrapper, 'Sign out').trigger('click');
    await flushPromises();

    expect(requests(logout)).toHaveLength(1);
    const alerts = wrapper
      .findAll('[role="alert"]')
      .map((alert) => alert.text())
      .filter(Boolean);
    expect(alerts).toEqual(['Something went wrong. Please try again later.']);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('offers a skip, and no sign-out, when MFA is a reminder', async () => {
    const wrapper = await mountPage({ mfa_required: false });

    expect(() => buttonNamed(wrapper, 'Sign out')).toThrow();
    await buttonNamed(wrapper, 'Skip for now').trigger('click');
    await flushPromises();

    // On to where the sign-in was headed: the Academy's onLogin
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });
});
