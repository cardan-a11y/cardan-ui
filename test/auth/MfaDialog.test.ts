import { describe, it, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaDialog, PasswordConfirmationDialog } from '#components';
import { useMfa, useMfaDialog } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import {
  RECOVERY_CODES,
  buttonNamed,
  client,
  fortify,
  navigate,
  refuse,
  refuseWith,
  requests,
  twoFactorApi,
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

const enable = 'POST /api/user/two-factor-authentication';
const confirm = 'POST /api/user/confirmed-two-factor-authentication';

/**
 * The dialog as an account settings page mounts it, with the password
 * confirmation it asks through. The steps are reached by clicking, as a
 * user does.
 */
async function mountDialog() {
  const wrapper = await mountSuspended(
    defineComponent({
      emits: ['refresh'],
      setup:
        (_, { emit }) =>
        () => [
          h(MfaDialog, { onRefresh: () => emit('refresh') }),
          h(PasswordConfirmationDialog),
        ],
    }),
    { attachTo: document.body },
  );

  const [dialog, passwordDialog] = wrapper.findAll('dialog');
  return {
    wrapper,
    dialog: dialog!,
    passwordDialog: passwordDialog!,
    button: (name: string) => buttonNamed(wrapper, name),
  };
}

/** The element of the dialog that holds this text, and focus */
function stepWith(element: Element) {
  return element.closest('[tabindex="-1"]')!;
}

describe('MfaDialog: enabling', () => {
  useScenario(academy);

  it('walks from the intro through the QR code and the code to the recovery codes', async () => {
    const user = academy.user({ mfa_enabled: false });
    fortify(twoFactorApi(academy, user));
    const { wrapper, dialog, button } = await mountDialog();

    useMfaDialog().openMfaEnableDialog();
    await flushPromises();

    expect(dialog.attributes('open')).toBeDefined();
    expect(accessibleName(dialog)).toBe('Multi-factor authentication');
    expect(await checkA11y()).toHaveNoViolations();

    // The QR code, as an image with a name, and the key to type over
    await button('Enable MFA').trigger('click');
    await flushPromises();

    expect(requests(enable)).toHaveLength(1);
    expect(accessibleName(dialog)).toBe('Set up authentication app');
    const qr = dialog.get('[role="img"]');
    expect(accessibleName(qr)).toBe(
      'QR code for setting up multi-factor authentication',
    );
    expect(qr.find('script').exists()).toBe(false);
    expect(dialog.text()).toContain('JBSW Y3DP EHPK 3PXP');
    expectFocused(stepWith(qr.element));
    expect(await checkA11y()).toHaveNoViolations();

    // The code field takes focus, and Confirm waits for six digits
    await button('Continue').trigger('click');
    await flushPromises();

    const code = dialog.get('input[name="code"]');
    expectFocused(code);
    expect(button('Confirm').attributes('disabled')).toBeDefined();
    await code.setValue('123456');
    expect(button('Confirm').attributes('disabled')).toBeUndefined();

    await button('Confirm').trigger('click');
    await flushPromises();

    expect(requests(confirm)).toEqual([{ code: '123456', recovery_code: '' }]);
    expect(accessibleName(dialog)).toBe('Multi-factor authentication enabled');
    const codes = dialog.findAll('li').map((item) => item.text());
    expect(codes).toEqual(RECOVERY_CODES);
    expectFocused(stepWith(dialog.get('li').element));
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps the code step with the error in the alert after a wrong code', async () => {
    const message = 'The provided two factor authentication code was invalid.';
    fortify(
      twoFactorApi(academy, academy.user({ mfa_enabled: false }), {
        [confirm]: refuseWith(academy.fortifyRouteError('code', message)),
      }),
    );
    const { wrapper, dialog, button } = await mountDialog();

    useMfaDialog().openMfaEnableDialog();
    await flushPromises();
    await button('Enable MFA').trigger('click');
    await flushPromises();
    await button('Continue').trigger('click');
    await flushPromises();

    const code = dialog.get('input[name="code"]');
    await code.setValue('000000');
    await button('Confirm').trigger('click');
    await flushPromises();

    expect(dialog.get('[role="alert"]').text()).toBe(message);
    expect(dialog.get('input[name="code"]').element).toBe(code.element);
    expectFocused(code);
    expect(wrapper.emitted('refresh')).toBeUndefined();
  });

  it('asks for the password when Fortify answers 423, then enables', async () => {
    let answered = 0;
    fortify(
      twoFactorApi(academy, academy.user({ mfa_enabled: false }), {
        [enable]: () => {
          if (answered++ === 0) throw refuse(423)(undefined);
          return {};
        },
      }),
    );
    const { dialog, passwordDialog, button } = await mountDialog();

    useMfaDialog().openMfaEnableDialog();
    await flushPromises();
    const enableButton = button('Enable MFA');
    await enableButton.trigger('click');
    await flushPromises();

    // On top of the MFA dialog, with focus in its password field
    expect(passwordDialog.attributes('open')).toBeDefined();
    expect(accessibleName(passwordDialog)).toBe('Confirm your password');
    const password = passwordDialog.get('input[name="password"]');
    expectFocused(password);
    expect(password.attributes('autocomplete')).toBe('current-password');
    // Busy until the QR code shows, so a second click starts nothing
    expect(enableButton.attributes('aria-busy')).toBe('true');

    await password.setValue('secret');
    await buttonNamed(passwordDialog, 'Confirm').trigger('click');
    await flushPromises();

    expect(requests('POST /api/user/confirm-password')).toEqual([
      { password: 'secret' },
    ]);
    expect(passwordDialog.attributes('open')).toBeUndefined();
    // Asked once more, now that the password is confirmed
    expect(requests(enable)).toHaveLength(2);
    expect(accessibleName(dialog)).toBe('Set up authentication app');
  });

  it('keeps the intro when the password confirmation is cancelled', async () => {
    fortify(
      twoFactorApi(academy, academy.user({ mfa_enabled: false }), {
        'GET /api/user/confirmed-password-status': () => ({ confirmed: false }),
      }),
    );
    const { dialog, passwordDialog, button } = await mountDialog();

    useMfaDialog().openMfaEnableDialog();
    await flushPromises();
    await button('Enable MFA').trigger('click');
    await flushPromises();

    await buttonNamed(passwordDialog, 'Cancel').trigger('click');
    await flushPromises();

    expect(passwordDialog.attributes('open')).toBeUndefined();
    expect(requests(enable)).toEqual([]);
    expect(accessibleName(dialog)).toBe('Multi-factor authentication');
    expect(dialog.get('[role="alert"]').text()).toBe('');
    expect(button('Enable MFA').attributes('aria-busy')).toBeUndefined();
  });

  it('forgets the flow when it closes', async () => {
    fortify(twoFactorApi(academy, academy.user({ mfa_enabled: false })));
    const { dialog, button } = await mountDialog();

    useMfaDialog().openMfaEnableDialog();
    await flushPromises();
    await button('Enable MFA').trigger('click');
    await flushPromises();

    await buttonNamed(dialog, 'Close').trigger('click');
    await flushPromises();

    expect(dialog.attributes('open')).toBeUndefined();
    const { qrCode, qrCodeUrl, recoveryCodes } = useMfa();
    expect([qrCode.value, qrCodeUrl.value, recoveryCodes.value]).toEqual([
      '',
      '',
      [],
    ]);

    // Opened again, it starts at the intro
    useMfaDialog().openMfaEnableDialog();
    await flushPromises();
    expect(accessibleName(dialog)).toBe('Multi-factor authentication');
    expect(button('Enable MFA').exists()).toBe(true);
  });
});

describe('MfaDialog: disabling', () => {
  useScenario(academy);

  it('confirms, disables, and says MFA is off, with focus on the result', async () => {
    fortify(twoFactorApi(academy, academy.user({ mfa_enabled: false })));
    const { wrapper, dialog, button } = await mountDialog();

    await useMfaDialog().openMfaDisableDialog();
    await flushPromises();

    expect(dialog.text()).toContain(
      'Disable multi-factor authentication for your account.',
    );

    await button('Disable MFA').trigger('click');
    await flushPromises();

    expect(requests('DELETE /api/user/two-factor-authentication')).toHaveLength(
      1,
    );
    const result = dialog
      .findAll('p')
      .find((p) => p.text().startsWith('Multi-factor authentication has been'));
    expect(result).toBeDefined();
    expectFocused(stepWith(result!.element));
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('shows a refused disable in the alert, with the button at rest', async () => {
    fortify(
      twoFactorApi(academy, academy.user(), {
        'DELETE /api/user/two-factor-authentication': refuse(500),
      }),
    );
    const { wrapper, dialog, button } = await mountDialog();

    await useMfaDialog().openMfaDisableDialog();
    await flushPromises();
    await button('Disable MFA').trigger('click');
    await flushPromises();

    expect(dialog.get('[role="alert"]').text()).toBe(
      'Something went wrong. Please try again later.',
    );
    expect(button('Disable MFA').attributes('aria-busy')).toBeUndefined();
    expect(wrapper.emitted('refresh')).toBeUndefined();
  });
});
