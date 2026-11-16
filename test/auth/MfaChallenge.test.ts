import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { MfaChallenge } from '#components';
import { useMfa, useToast } from '#imports';
import { accessibleName, checkA11y, expectFocused } from '../a11y';
import {
  client,
  fortify,
  navigate,
  refuse,
  refuseWith,
  requests,
  useScenario,
} from './fortify';
import { scenarios } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

const challenge = 'POST /api/two-factor-challenge';

/** The challenge page, reached from the login page with a `?redirect=` */
async function mountChallenge() {
  const wrapper = await mountSuspended(MfaChallenge, {
    props: { card: false },
    route: '/two-factor-authentication?redirect=%2Fcourses%2F1',
    attachTo: document.body,
  });

  const button = (name: string) => {
    const found = wrapper
      .findAll('button')
      .find((button) => accessibleName(button) === name);
    if (!found) throw new Error(`No button named ${name}`);
    return found;
  };

  return { wrapper, button, submit: () => button('Sign in') };
}

describe.each(scenarios)('MfaChallenge ($name)', (scenario) => {
  useScenario(scenario);

  const identity = `GET ${scenario.sanctum.endpoints.user}` as const;

  it('starts in a code field made for one-time codes', async () => {
    const { wrapper } = await mountChallenge();

    const code = wrapper.get('input[name="code"]');
    expectFocused(code);
    expect(accessibleName(code)).toMatch(/^Confirmation code/);
    expect(code.attributes('autocomplete')).toBe('one-time-code');
    expect(code.attributes('inputmode')).toBe('numeric');
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('keeps Sign in disabled until six digits are entered', async () => {
    // An owner's decision: Enter in the field submits nothing before that
    const { wrapper, submit } = await mountChallenge();
    const code = wrapper.get('input[name="code"]');

    expect(submit().attributes('disabled')).toBeDefined();
    await code.setValue('12345');
    expect(submit().attributes('disabled')).toBeDefined();
    await code.setValue('123456');
    expect(submit().attributes('disabled')).toBeUndefined();
  });

  it('moves focus to the recovery code field and back', async () => {
    const { wrapper, button } = await mountChallenge();

    await button('Use a recovery code').trigger('click');
    await flushPromises();

    const recovery = wrapper.get('input[name="recovery_code"]');
    expectFocused(recovery);
    expect(accessibleName(recovery)).toMatch(/^Recovery code/);
    // Typed or pasted from where it was stored: nothing autofills it
    expect(recovery.attributes('autocomplete')).toBe('off');
    expect(wrapper.text()).toContain('Enter one of your recovery codes');
    expect(await checkA11y()).toHaveNoViolations();

    await button('Use a verification code').trigger('click');
    await flushPromises();

    expectFocused(wrapper.get('input[name="code"]'));
  });

  it('posts the code, reads the identity and goes where the sign-in was headed', async () => {
    fortify({
      [challenge]: () => ({}),
      [identity]: () => ({ data: scenario.user() }),
    });
    const { wrapper, submit } = await mountChallenge();

    await wrapper.get('input[name="code"]').setValue('123456');
    await submit().trigger('click');
    await flushPromises();

    expect(requests(challenge)).toEqual([
      { code: '123456', recovery_code: '' },
    ]);
    expect(requests(identity)).toHaveLength(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/courses/1');
    // The code is spent: nothing of it is kept
    expect(useMfa().mfaCredentials.value).toEqual({
      code: '',
      recovery_code: '',
    });
  });

  it('posts a recovery code instead', async () => {
    fortify({
      [challenge]: () => ({}),
      [identity]: () => ({ data: scenario.user() }),
    });
    const { wrapper, button, submit } = await mountChallenge();

    await button('Use a recovery code').trigger('click');
    await flushPromises();
    await wrapper.get('input[name="recovery_code"]').setValue('abcde-fghij');
    await submit().trigger('click');
    await flushPromises();

    expect(requests(challenge)).toEqual([
      { code: '', recovery_code: 'abcde-fghij' },
    ]);
  });

  it('continues when the code was accepted but the identity could not be read', async () => {
    fortify({ [challenge]: () => ({}), [identity]: refuse(500) });
    const { wrapper, submit } = await mountChallenge();

    await wrapper.get('input[name="code"]').setValue('123456');
    await submit().trigger('click');
    await flushPromises();

    // A retry would send a spent code
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/courses/1');
    expect(wrapper.get('[role="alert"]').text()).toBe('');
  });

  it('shows a refused code in the alert and keeps focus', async () => {
    const message = 'The provided two factor authentication code was invalid.';
    fortify({
      [challenge]: refuseWith(scenario.fortifyRouteError('code', message)),
    });
    const { wrapper, submit } = await mountChallenge();
    const code = wrapper.get('input[name="code"]');

    await code.setValue('000000');
    await submit().trigger('click');
    await flushPromises();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toBe(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);
    // An owner's decision: the server's error is in the alert, not on the field
    expect(code.attributes('aria-invalid')).toBeUndefined();
    expectFocused(code);
    expect(navigate).not.toHaveBeenCalled();
    expect(submit().attributes('aria-busy')).toBeUndefined();
  });

  it('sends an expired sign-in back to the login page, with the redirect and a word why', async () => {
    fortify({ [challenge]: refuse(401, { message: 'Unauthenticated.' }) });
    const { wrapper, submit } = await mountChallenge();

    await wrapper.get('input[name="code"]').setValue('123456');
    await submit().trigger('click');
    await flushPromises();

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/login',
      query: { redirect: '/courses/1' },
    });
    expect(useToast().toasts.value.map((toast) => toast.label)).toEqual([
      'Your session has expired. Sign in again to continue.',
    ]);
  });
});
