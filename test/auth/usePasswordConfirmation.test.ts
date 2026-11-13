import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { PasswordConfirmationDialog } from '#components';
import { usePasswordConfirmation } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import { fetchError } from '../fetch';
import {
  buttonNamed,
  client,
  fortify,
  navigate,
  refuseWith,
  requests,
  signIn,
  useScenario,
} from './fortify';
import { academy, scenarios } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const confirmPassword = 'POST /api/user/confirm-password';

async function mountDialog() {
  const wrapper = await mountSuspended(PasswordConfirmationDialog, {
    attachTo: document.body,
  });
  const dialog = wrapper.get('dialog');

  /** Types the password and confirms it */
  async function confirmWith(password: string) {
    await dialog.get('input[name="password"]').setValue(password);
    await buttonNamed(dialog, 'Confirm').trigger('click');
    await flushPromises();
  }

  return { wrapper, dialog, confirmWith };
}

/** A request behind Fortify's `password.confirm`: 423 until confirmed */
function lockedRequest() {
  let confirmed = false;
  const request = vi.fn(async () => {
    if (!confirmed) {
      throw fetchError(423, { message: 'Password confirmation required.' });
    }
    return 'done';
  });
  return { request, unlock: () => (confirmed = true) };
}

describe('usePasswordConfirmation', () => {
  useScenario(academy);

  it('rejects a request when no dialog is mounted', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { requestPasswordConfirmation, passwordConfirmationDialogRef } =
      usePasswordConfirmation();

    passwordConfirmationDialogRef.value = null;

    // A caller that would otherwise wait forever, on a loading button
    await expect(requestPasswordConfirmation()).rejects.toThrow(
      'PasswordConfirmationDialog',
    );
    expect(consoleError).toHaveBeenCalledOnce();

    consoleError.mockRestore();
  });

  it('asks on a 423 in a named dialog, then runs the request once more', async () => {
    signIn(academy.user());
    fortify({ [confirmPassword]: () => ({}) });
    const { dialog, confirmWith } = await mountDialog();
    const { request, unlock } = lockedRequest();

    const result = usePasswordConfirmation().withPasswordConfirmation(request);
    await flushPromises();

    expect(dialog.attributes('open')).toBeDefined();
    expect(accessibleName(dialog)).toBe('Confirm your password');
    const password = dialog.get('input[name="password"]');
    expectFocused(password);
    expect(accessibleName(password)).toMatch(/^Password/);
    // The account, for a password manager, out of the accessibility tree
    const username = dialog.get('input[autocomplete="username"]');
    expect(username.element.getAttribute('value')).toBe('ada@example.com');
    expect(username.attributes('hidden')).toBeDefined();
    // Nothing to confirm before a password is typed
    expect(buttonNamed(dialog, 'Confirm').attributes('disabled')).toBeDefined();
    expect(await checkA11y()).toHaveNoViolations();

    unlock();
    await confirmWith('secret');

    expect(requests(confirmPassword)).toEqual([{ password: 'secret' }]);
    expect(dialog.attributes('open')).toBeUndefined();
    await expect(result).resolves.toBe('done');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('rethrows the 423 when the user cancels', async () => {
    const { dialog } = await mountDialog();
    const { request } = lockedRequest();

    const result = usePasswordConfirmation()
      .withPasswordConfirmation(request)
      .catch((error: unknown) => error);
    await flushPromises();
    await buttonNamed(dialog, 'Cancel').trigger('click');

    await expect(result).resolves.toMatchObject({ status: 423 });
    expect(request).toHaveBeenCalledOnce();
    expect(requests(confirmPassword)).toEqual([]);
  });

  it('finishes the work it was for before closing, with Confirm still busy', async () => {
    fortify({ [confirmPassword]: () => ({}) });
    const { dialog, confirmWith } = await mountDialog();

    const seen: { open: boolean; busy?: string }[] = [];
    const afterConfirm = vi.fn(async () => {
      const confirm = dialog.get('button[type="submit"]');
      seen.push({
        open: dialog.attributes('open') !== undefined,
        busy: confirm.attributes('aria-busy'),
      });
    });

    const result =
      usePasswordConfirmation().requestPasswordConfirmation(afterConfirm);
    await flushPromises();
    await confirmWith('secret');

    expect(seen).toEqual([{ open: true, busy: 'true' }]);
    await expect(result).resolves.toBe(true);
    expect(dialog.attributes('open')).toBeUndefined();
  });

  it('skips the dialog while the password is still confirmed', async () => {
    fortify({
      'GET /api/user/confirmed-password-status': () => ({ confirmed: true }),
    });
    const { dialog } = await mountDialog();

    await expect(
      usePasswordConfirmation().ensurePasswordConfirmed(),
    ).resolves.toBe(true);
    expect(dialog.attributes('open')).toBeUndefined();
  });

  it('is answered by the dialog mounted last, and by the other once that one goes', async () => {
    const layout = await mountDialog();
    const flow = await mountDialog();

    void usePasswordConfirmation().requestPasswordConfirmation();
    await flushPromises();
    expect(flow.dialog.attributes('open')).toBeDefined();
    expect(layout.dialog.attributes('open')).toBeUndefined();
    await buttonNamed(flow.dialog, 'Cancel').trigger('click');

    flow.wrapper.unmount();
    void usePasswordConfirmation().requestPasswordConfirmation();
    await flushPromises();
    expect(layout.dialog.attributes('open')).toBeDefined();
  });
});

describe.each(scenarios)('usePasswordConfirmation ($name)', (scenario) => {
  useScenario(scenario);

  it('keeps the dialog open with a refused password in its alert', async () => {
    const message = 'The provided password was incorrect.';
    fortify({
      [confirmPassword]: refuseWith(
        scenario.fortifyRouteError('password', message),
      ),
    });
    const { dialog, confirmWith } = await mountDialog();

    const result = usePasswordConfirmation().requestPasswordConfirmation();
    await flushPromises();
    await confirmWith('wrong');

    expect(dialog.attributes('open')).toBeDefined();
    const alert = dialog.get('[role="alert"]');
    expect(alert.text()).toBe(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);
    expect(
      dialog.get('input[name="password"]').attributes('aria-invalid'),
    ).toBeUndefined();
    expect(
      buttonNamed(dialog, 'Confirm').attributes('aria-busy'),
    ).toBeUndefined();

    // Cancelled after all: answered as not confirmed
    await buttonNamed(dialog, 'Cancel').trigger('click');
    await expect(result).resolves.toBe(false);
  });
});
