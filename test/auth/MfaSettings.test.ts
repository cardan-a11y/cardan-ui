import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaSettings } from '#components';
import { useMfaDialog } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import {
  RECOVERY_CODES,
  buttonNamed,
  client,
  fortify,
  navigate,
  pending,
  refuse,
  requests,
  signIn,
  twoFactorApi,
  useScenario,
  type Routes,
} from './fortify';
import { academy } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const identity = `GET ${academy.sanctum.endpoints.user}` as const;
const disable = 'DELETE /api/user/two-factor-authentication';
const passwordStatus = 'GET /api/user/confirmed-password-status';

/**
 * MfaSettings on the Academy's account page, for an account with MFA on and
 * these flags. After disabling, the identity endpoint answers with MFA off.
 */
async function mountSettings(
  flags: Record<string, unknown>,
  overrides: Routes = {},
) {
  signIn(academy.user({ mfa_enabled: true, ...flags }));
  fortify(
    twoFactorApi(
      academy,
      academy.user({ ...flags, mfa_enabled: false }),
      overrides,
    ),
  );

  const wrapper = await mountSuspended(MfaSettings, {
    route: '/auth?tab=security',
    attachTo: document.body,
  });
  const [dialog] = wrapper.findAll('dialog');

  return {
    wrapper,
    dialog: dialog!,
    button: (name: string) => buttonNamed(wrapper, name),
  };
}

/** The "MFA is off" step of the dialog */
const disabledText = 'Multi-factor authentication has been disabled.';

describe('MfaSettings: disabling (Academy)', () => {
  useScenario(academy);

  it('says MFA is on and names its actions', async () => {
    const { wrapper } = await mountSettings({});

    expect(wrapper.text()).toContain('Multi-factor authentication is enabled.');
    expect(
      wrapper
        .findAll('button')
        .filter((button) => !button.element.closest('dialog'))
        .map((button) => accessibleName(button)),
    ).toEqual(['Regenerate recovery codes', 'Disable MFA']);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it.each([
    ['optional', { mfa_required: false }],
    [
      'required of an exempted account',
      { mfa_required: true, mfa_exempt: true },
    ],
  ])('switches MFA off and says so when it is %s', async (_, flags) => {
    const { wrapper, dialog, button } = await mountSettings(flags);

    await button('Disable MFA').trigger('click');
    await flushPromises();
    expect(dialog.attributes('open')).toBeDefined();

    await buttonNamed(dialog, 'Disable MFA').trigger('click');
    await flushPromises();

    expect(requests(disable)).toHaveLength(1);
    expect(dialog.text()).toContain(disabledText);
    expect(navigate).not.toHaveBeenCalled();
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    // The page follows the identity read afterwards
    expect(wrapper.text()).toContain(
      'Multi-factor authentication is not enabled.',
    );
    expect(button('Enable MFA').exists()).toBe(true);
  });

  it('sends a required account to set MFA up again, without the "MFA is off" step', async () => {
    const { wrapper, dialog, button } = await mountSettings({
      mfa_required: true,
    });

    expect(wrapper.text()).toContain('To move to a new authenticator app');
    await button('Set up MFA again').trigger('click');
    await flushPromises();
    await buttonNamed(dialog, 'Disable MFA').trigger('click');
    await flushPromises();

    expect(requests(disable)).toHaveLength(1);
    expect(dialog.text()).not.toContain(disabledText);
    expect(dialog.attributes('open')).toBeUndefined();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/mfa-setup',
      query: { redirect: '/auth?tab=security' },
    });
    expect(wrapper.emitted('refresh')).toHaveLength(1);
  });

  it('still sends a required account on when the identity cannot be read', async () => {
    const { wrapper, dialog, button } = await mountSettings(
      { mfa_required: true },
      { [identity]: refuse(500) },
    );

    await button('Set up MFA again').trigger('click');
    await flushPromises();
    await buttonNamed(dialog, 'Disable MFA').trigger('click');
    await flushPromises();

    // MFA did change: the app re-syncs, the dialog closes, nothing stays busy
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(dialog.attributes('open')).toBeUndefined();
    expect(navigate).toHaveBeenCalledOnce();
    expect(button('Set up MFA again').attributes('aria-busy')).toBeUndefined();

    // Opened again, its confirmation is at rest
    await button('Set up MFA again').trigger('click');
    await flushPromises();
    expect(
      buttonNamed(dialog, 'Disable MFA').attributes('aria-busy'),
    ).toBeUndefined();
  });

  it('says MFA is off with the button at rest when the identity cannot be read', async () => {
    const { wrapper, dialog, button } = await mountSettings(
      { mfa_required: false },
      { [identity]: refuse(500) },
    );

    await button('Disable MFA').trigger('click');
    await flushPromises();
    await buttonNamed(dialog, 'Disable MFA').trigger('click');
    await flushPromises();

    expect(dialog.text()).toContain(disabledText);
    expect(dialog.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(button('Disable MFA').attributes('aria-busy')).toBeUndefined();
  });

  it('ignores a second click while it checks the password confirmation', async () => {
    const status = pending({ confirmed: true });
    const { dialog, button } = await mountSettings(
      {},
      { [passwordStatus]: status.handler },
    );
    const disableButton = button('Disable MFA');

    await disableButton.trigger('click');
    expect(disableButton.attributes('aria-busy')).toBe('true');
    await disableButton.trigger('click');

    status.answer();
    await flushPromises();

    expect(requests(passwordStatus)).toHaveLength(1);
    expect(dialog.attributes('open')).toBeDefined();
    expect(disableButton.attributes('aria-busy')).toBeUndefined();
  });

  it('opens once when an app’s own button asks twice while it checks', async () => {
    // Not every button an app wires to it ignores clicks while loading
    const status = pending({ confirmed: true });
    const { dialog } = await mountSettings(
      {},
      { [passwordStatus]: status.handler },
    );

    const first = useMfaDialog().openMfaDisableDialog();
    await useMfaDialog().openMfaDisableDialog();
    status.answer();
    await first;
    await flushPromises();

    expect(requests(passwordStatus)).toHaveLength(1);
    expect(dialog.attributes('open')).toBeDefined();
  });

  it('asks for the password first when it is not confirmed, and opens nothing on cancel', async () => {
    const { wrapper, dialog, button } = await mountSettings(
      {},
      { [passwordStatus]: () => ({ confirmed: false }) },
    );
    const passwordDialog = wrapper.findAll('dialog').at(-1)!;

    await button('Disable MFA').trigger('click');
    await flushPromises();

    expect(passwordDialog.attributes('open')).toBeDefined();
    expect(dialog.attributes('open')).toBeUndefined();

    await buttonNamed(passwordDialog, 'Cancel').trigger('click');
    await flushPromises();

    expect(dialog.attributes('open')).toBeUndefined();
    expect(requests(disable)).toEqual([]);
  });
});

describe('MfaSettings: replacing the recovery codes (Academy)', () => {
  useScenario(academy);

  const generate = 'POST /api/user/two-factor-recovery-codes';

  it('asks to replace them, then shows the new ones once, with focus on their heading', async () => {
    const { wrapper, button } = await mountSettings({});
    const dialog = wrapper.findAll('dialog')[1]!;

    await button('Regenerate recovery codes').trigger('click');
    await flushPromises();

    expect(dialog.attributes('open')).toBeDefined();
    expect(accessibleName(dialog)).toBe('Regenerate recovery codes');
    expect(dialog.findAll('li')).toHaveLength(0);

    await buttonNamed(dialog, 'Generate new codes').trigger('click');
    await flushPromises();

    expect(requests(generate)).toHaveLength(1);
    expect(dialog.findAll('li').map((item) => item.text())).toEqual(
      RECOVERY_CODES,
    );
    const heading = dialog.get('h2');
    expect(heading.text()).toBe('Recovery codes');
    expectFocused(heading);
    expect(await checkA11y()).toHaveNoViolations();

    // Closed, they are gone
    await buttonNamed(dialog, "I've stored my recovery codes").trigger('click');
    await flushPromises();
    expect(dialog.attributes('open')).toBeUndefined();
    expect(dialog.findAll('li')).toHaveLength(0);
  });

  it('says so in the alert when the new codes do not come', async () => {
    const { wrapper, button } = await mountSettings(
      {},
      { 'GET /api/user/two-factor-recovery-codes': () => [] },
    );
    const dialog = wrapper.findAll('dialog')[1]!;

    await button('Regenerate recovery codes').trigger('click');
    await flushPromises();
    await buttonNamed(dialog, 'Generate new codes').trigger('click');
    await flushPromises();

    // The old codes no longer work: silence would leave the user without any
    expect(dialog.get('[role="alert"]').text()).toBe(
      'Your new recovery codes could not be shown, and your old ones no longer work. Generate new codes again.',
    );
  });
});
