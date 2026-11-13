import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import {
  PasswordForgotForm,
  PasswordResetForm,
  PasswordUpdateForm,
} from '#components';
import { useLoginEmail, useMfaSetupReminder, useToast } from '#imports';
import { accessibleName, checkA11y, description, expectFocused } from '../a11y';
import {
  buttonNamed,
  client,
  fortify,
  navigate,
  refuse,
  refuseWith,
  requests,
  signIn,
  useScenario,
  type Routes,
} from './fortify';
import { academy, scenarios, type AuthScenario } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

/** The policy the Academy's endpoint answers, other than the config's 14 */
const API_MIN_LENGTH = 12;

/** The policy endpoint, where the scenario has one */
function policyRoute(scenario: AuthScenario): Routes {
  const endpoint = scenario.cardanAuth.endpoints.passwordPolicy;
  if (!endpoint) return {};
  return {
    [`GET ${endpoint}`]: () => ({
      data: { min_length: API_MIN_LENGTH, max_length: 128 },
    }),
  };
}

/** The minimum length the forms enforce under this scenario */
function minLength(scenario: AuthScenario) {
  return scenario.cardanAuth.endpoints.passwordPolicy
    ? API_MIN_LENGTH
    : scenario.cardanAuth.passwordPolicy.minLength;
}

const toasts = () => useToast().toasts.value.map((toast) => toast.label);

describe.each(scenarios)('PasswordForgotForm ($name)', (scenario) => {
  useScenario(scenario);

  const forgot =
    `POST ${scenario.cardanAuth.endpoints.forgotPassword}` as const;

  it('starts from the address typed on the login page and says the link was sent', async () => {
    useLoginEmail().value = 'ada@example.com';
    fortify({ [forgot]: () => ({}) });
    const wrapper = await mountSuspended(PasswordForgotForm, {
      attachTo: document.body,
    });

    const email = wrapper.get<HTMLInputElement>('input[name="email"]');
    expect(email.element.value).toBe('ada@example.com');
    expect(accessibleName(email)).toMatch(/^Email/);
    expect(email.attributes('autocomplete')).toBe('username');

    const submit = buttonNamed(wrapper, 'Request password reset');
    await submit.trigger('click');
    await flushPromises();

    expect(requests(forgot)).toEqual([{ email: 'ada@example.com' }]);
    // Announced by its live region
    const status = wrapper.get('form > [aria-live="polite"]');
    expect(status.text()).toContain(
      'We have emailed your password reset link.',
    );
    expect(submit.attributes('disabled')).toBeDefined();
    expect(await checkA11y()).toHaveNoViolations();

    // Another address can ask for a link of its own
    await email.setValue('grace@example.com');
    expect(status.text()).toBe('');
    expect(submit.attributes('disabled')).toBeUndefined();
  });

  it('shows a refusal in the alert, in its language', async () => {
    const message = 'Too many attempts. Wait a minute.';
    fortify({
      [forgot]: refuseWith(scenario.passwordRouteError('email', message)),
    });
    const wrapper = await mountSuspended(PasswordForgotForm, {
      attachTo: document.body,
    });

    await wrapper.get('input[name="email"]').setValue('ada@example.com');
    await buttonNamed(wrapper, 'Request password reset').trigger('click');
    await flushPromises();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toBe(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);
    expect(wrapper.get('form > [aria-live="polite"]').text()).toBe('');
    expect(
      wrapper.get('input[name="email"]').attributes('aria-invalid'),
    ).toBeUndefined();
  });
});

describe.each(scenarios)('PasswordResetForm ($name)', (scenario) => {
  useScenario(scenario);

  const reset = `POST ${scenario.cardanAuth.endpoints.resetPassword}` as const;
  const login = `POST ${scenario.sanctum.endpoints.login}` as const;
  const identity = `GET ${scenario.sanctum.endpoints.user}` as const;
  const strong = 'correct horse battery staple';

  async function mountReset(
    query = '?token=abc123&email=ada%40example.com',
    routes: Routes = {},
  ) {
    fortify({ ...policyRoute(scenario), ...routes });
    const wrapper = await mountSuspended(PasswordResetForm, {
      route: `/reset-password${query}`,
      attachTo: document.body,
    });
    await flushPromises();

    async function save() {
      await wrapper.get('input[name="password"]').setValue(strong);
      await wrapper.get('input[name="password_confirmation"]').setValue(strong);
      await buttonNamed(wrapper, 'Save password').trigger('click');
      await flushPromises();
    }

    return { wrapper, save };
  }

  it('describes the new password by the requirements of the API’s policy', async () => {
    const { wrapper } = await mountReset();

    const password = wrapper.get('input[name="password"]');
    expect(accessibleName(password)).toMatch(/^New password/);
    expect(password.attributes('autocomplete')).toBe('new-password');
    expect(password.attributes('minlength')).toBe(String(minLength(scenario)));
    expect(description(password)).toContain(
      `Must be at least ${minLength(scenario)} characters long`,
    );

    // The checks the API runs on save are listed only where it runs them
    const serverChecks = 'Must not appear in a known data breach';
    if (scenario.cardanAuth.passwordPolicy.serverChecks) {
      expect(description(password)).toContain(serverChecks);
    } else {
      expect(description(password)).not.toContain(serverChecks);
    }

    // The length is checked while typing, and the list says so
    expect(description(password)).toContain(
      'Password does not meet length requirement',
    );
    await password.setValue(strong);
    expect(description(password)).toContain(
      'Password meets length requirement',
    );
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('takes the address from the link, for password managers only', async () => {
    const { wrapper } = await mountReset();

    const email = wrapper.get('input[name="email"]');
    expect(email.attributes('hidden')).toBeDefined();
    expect(email.attributes('autocomplete')).toBe('username');
    expect(email.element.getAttribute('value')).toBe('ada@example.com');
  });

  it('asks for the address when the link has none', async () => {
    const { wrapper } = await mountReset('?token=abc123');

    const email = wrapper.get('input[name="email"]');
    expect(email.attributes('hidden')).toBeUndefined();
    expect(accessibleName(email)).toMatch(/^Email/);
    expect(email.attributes('required')).toBeDefined();
  });

  it('sets the password, signs in and goes on', async () => {
    // Without MFA, where the API says so
    const user = scenario.user(scenario.mfaFlags ? { mfa_enabled: false } : {});
    const { save } = await mountReset(undefined, {
      [reset]: () => ({}),
      [login]: () => ({}),
      [identity]: () => ({ data: user }),
    });

    await save();

    expect(requests(reset)).toEqual([
      {
        token: 'abc123',
        email: 'ada@example.com',
        password: strong,
        password_confirmation: strong,
      },
    ]);
    expect(requests(login)).toEqual([
      { email: 'ada@example.com', password: strong },
    ]);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      scenario.sanctum.redirect.onLogin,
    );
    // Signed in like on the login page: past the setup page, where the API
    // takes part in the reminder
    expect(useMfaSetupReminder().isReminderPending.value).toBe(
      scenario.mfaFlags,
    );
  });

  it('goes through the challenge when the account has MFA', async () => {
    const { save } = await mountReset(
      '?token=abc123&email=ada%40example.com&redirect=%2Fcourses%2F1',
      { [reset]: () => ({}), [login]: () => ({ two_factor: true }) },
    );

    await save();

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/two-factor-authentication',
      query: { redirect: '/courses/1' },
    });
    expect(requests(identity)).toEqual([]);
  });

  it('hands over to the login page when the sign-in fails, saying the password was saved', async () => {
    const { wrapper, save } = await mountReset(undefined, {
      [reset]: () => ({}),
      [login]: refuse(429, { message: 'Too Many Attempts.' }),
    });

    await save();

    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/login',
      query: { redirect: undefined },
    });
    expect(useLoginEmail().value).toBe('ada@example.com');
    expect(toasts()).toEqual(['Your new password has been saved.']);
    // Not an error of the reset
    expect(wrapper.get('[role="alert"]').text()).toBe('');
  });

  it('shows an expired link in the alert and stays', async () => {
    const message = 'This password reset token is invalid.';
    const { wrapper, save } = await mountReset(undefined, {
      [reset]: refuseWith(scenario.passwordRouteError('email', message)),
    });

    await save();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toBe(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);
    expect(requests(login)).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    expect(
      buttonNamed(wrapper, 'Save password').attributes('aria-busy'),
    ).toBeUndefined();
  });
});

describe('PasswordResetForm (Academy, policy endpoint not public)', () => {
  useScenario(academy);

  it('keeps the configured policy when the endpoint answers no policy', async () => {
    fortify({
      'GET /api/v1/password-policy': () => ({ message: 'Unauthenticated.' }),
    });
    const wrapper = await mountSuspended(PasswordResetForm, {
      route: '/reset-password?token=abc123&email=ada%40example.com',
      attachTo: document.body,
    });
    await flushPromises();

    expect(description(wrapper.get('input[name="password"]'))).toContain(
      'Must be at least 14 characters long',
    );
    // A guest mid-reset is not sent to the login page
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe.each(scenarios)('PasswordUpdateForm ($name)', (scenario) => {
  useScenario(scenario);

  const update =
    `${scenario.cardanAuth.updatePasswordMethod} ${scenario.cardanAuth.endpoints.updatePassword}` as const;
  const strong = 'correct horse battery staple';

  async function mountUpdate(routes: Routes = {}) {
    signIn(scenario.user());
    fortify({ ...policyRoute(scenario), ...routes });
    const wrapper = await mountSuspended(PasswordUpdateForm, {
      attachTo: document.body,
    });
    await flushPromises();

    const field = (name: string) =>
      wrapper.get<HTMLInputElement>(`input[name="${name}"]`);

    async function save(newPassword = strong) {
      await field('current_password').setValue('old secret');
      await field('password').setValue(newPassword);
      await field('password_confirmation').setValue(newPassword);
      await buttonNamed(wrapper, 'Save password').trigger('click');
      await flushPromises();
    }

    return { wrapper, field, save };
  }

  it('names its three fields for people and password managers, and reveals them together', async () => {
    const { wrapper, field } = await mountUpdate();

    expect(accessibleName(field('current_password'))).toMatch(
      /^Current password/,
    );
    expect(field('current_password').attributes('autocomplete')).toBe(
      'current-password',
    );
    expect(accessibleName(field('password'))).toMatch(/^New password/);
    expect(field('password').attributes('autocomplete')).toBe('new-password');
    expect(accessibleName(field('password_confirmation'))).toMatch(
      /^Repeat password/,
    );
    expect(field('password_confirmation').attributes('autocomplete')).toBe(
      'new-password',
    );

    const reveal = buttonNamed(wrapper, 'Show password');
    await reveal.trigger('click');
    expect(reveal.attributes('aria-pressed')).toBe('true');
    expect(
      ['current_password', 'password', 'password_confirmation'].map((name) =>
        field(name).attributes('type'),
      ),
    ).toEqual(['text', 'text', 'text']);
    expect(await checkA11y()).toHaveNoViolations();
  });

  it(`saves with the app’s method and route, clears the fields and says so`, async () => {
    const { field, save } = await mountUpdate({ [update]: () => ({}) });

    await save();

    expect(requests(update)).toEqual([
      {
        current_password: 'old secret',
        password: strong,
        password_confirmation: strong,
      },
    ]);
    expect(field('current_password').element.value).toBe('');
    expect(field('password').element.value).toBe('');
    expect(toasts()).toEqual(['Your new password has been saved.']);
  });

  it('focuses a new password that is too short, described by the rule', async () => {
    const { field, save } = await mountUpdate();

    await save('short');

    expectFocused(field('password'));
    expect(field('password').attributes('aria-invalid')).toBe('true');
    expect(description(field('password'))).toContain(
      `Must be at least ${minLength(scenario)} characters long`,
    );
    expect(requests(update)).toEqual([]);
  });

  it('shows a refused current password in the alert, in its language', async () => {
    const message = 'The password is incorrect.';
    const { wrapper, field, save } = await mountUpdate({
      [update]: refuseWith(
        scenario.passwordRouteError('current_password', message),
      ),
    });

    await save();

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toBe(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);
    // An owner's decision: on the alert, not on the field
    expect(
      field('current_password').attributes('aria-invalid'),
    ).toBeUndefined();
    expect(toasts()).toEqual([]);
  });
});
