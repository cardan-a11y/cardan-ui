import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaSetup } from '#components';
import { useMfa } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import {
  RECOVERY_CODES,
  buttonNamed,
  client,
  fortify,
  navigate,
  refuse,
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

async function mountSetup(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(MfaSetup, {
    props,
    attachTo: document.body,
  });

  return {
    wrapper,
    button: (name: string) => buttonNamed(wrapper, name),
    /** The step heading, which takes focus at every step */
    heading: () => wrapper.get('h2'),
  };
}

/**
 * The enable flow on a page: each step replaces the content focus was in,
 * so focus moves to the step's heading; the code step to its field.
 */
describe('MfaSetup', () => {
  useScenario(academy);

  it('moves focus to the heading of each step, and to the code field', async () => {
    fortify(twoFactorApi(academy, academy.user({ mfa_enabled: false })));
    const { wrapper, button, heading } = await mountSetup({ autofocus: true });

    expectFocused(heading());
    expect(heading().text()).toBe('Multi-factor authentication');

    await button('Enable MFA').trigger('click');
    await flushPromises();

    expect(heading().text()).toBe('Set up authentication app');
    expectFocused(heading());
    expect(accessibleName(wrapper.get('[role="img"]'))).toBe(
      'QR code for setting up multi-factor authentication',
    );
    expect(await checkA11y()).toHaveNoViolations();

    await button('Continue').trigger('click');
    await flushPromises();
    expectFocused(wrapper.get('input[name="code"]'));

    // Back to the QR code, and its heading
    await button('Back').trigger('click');
    await flushPromises();
    expectFocused(heading());
    await button('Continue').trigger('click');
    await flushPromises();

    const code = wrapper.get('input[name="code"]');
    expect(button('Confirm').attributes('disabled')).toBeDefined();
    await code.setValue('123456');
    await button('Confirm').trigger('click');
    await flushPromises();

    expect(heading().text()).toBe('Multi-factor authentication enabled');
    expectFocused(heading());
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(
      RECOVERY_CODES,
    );
    expect(wrapper.emitted('refresh')).toHaveLength(1);
    expect(await checkA11y()).toHaveNoViolations();

    await button("I've stored my recovery codes").trigger('click');
    expect(wrapper.emitted('done')).toHaveLength(1);
  });

  it('asks for the password when Fortify answers 423, with its own dialog', async () => {
    let answered = 0;
    fortify(
      twoFactorApi(academy, academy.user({ mfa_enabled: false }), {
        [enable]: () => {
          if (answered++ === 0) throw refuse(423)(undefined);
          return {};
        },
      }),
    );
    const { wrapper, button, heading } = await mountSetup();

    await button('Enable MFA').trigger('click');
    await flushPromises();

    const passwordDialog = wrapper.get('dialog');
    expect(passwordDialog.attributes('open')).toBeDefined();
    const password = passwordDialog.get('input[name="password"]');
    expectFocused(password);

    await password.setValue('secret');
    await buttonNamed(passwordDialog, 'Confirm').trigger('click');
    await flushPromises();

    expect(requests(enable)).toHaveLength(2);
    expect(heading().text()).toBe('Set up authentication app');
    // Once the dialog has closed, on the step it was for
    expectFocused(heading());
  });

  it('offers a skip before MFA is on, unless the setup is required', async () => {
    const { wrapper, button } = await mountSetup();

    await button('Skip for now').trigger('click');
    expect(wrapper.emitted('skip')).toHaveLength(1);

    await wrapper.setProps({ skippable: false });
    expect(() => button('Skip for now')).toThrow();
  });

  it('starts afresh, whatever an earlier flow left behind', async () => {
    const { mfaStep, recoveryCodes } = useMfa();
    mfaStep.value = 4;
    recoveryCodes.value = ['left-behind'];

    const { wrapper, heading } = await mountSetup();

    expect(heading().text()).toBe('Multi-factor authentication');
    expect(wrapper.text()).not.toContain('left-behind');
  });
});
