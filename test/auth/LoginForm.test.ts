import { describe, it, expect, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { LoginForm } from '#components';
import { accessibleName, checkA11y, description, expectFocused } from '../a11y';
import { fetchError } from '../fetch';
import {
  client,
  fortify,
  navigate,
  pending,
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

async function mountForm(
  props: Record<string, unknown> = {},
  route = '/login',
) {
  const wrapper = await mountSuspended(LoginForm, {
    props: { autofocus: false, ...props },
    route,
    attachTo: document.body,
  });

  const email = wrapper.get<HTMLInputElement>('input[name="email"]');
  const password = wrapper.get<HTMLInputElement>('input[name="password"]');
  const submit = wrapper.get<HTMLButtonElement>('button[type="submit"]');

  /** Fills in the credentials and submits, as a click on Sign in does */
  async function signIn() {
    await email.setValue('ada@example.com');
    await password.setValue('secret');
    submit.element.focus();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
  }

  return { wrapper, email, password, submit, signIn };
}

describe.each(scenarios)('LoginForm ($name)', (scenario) => {
  useScenario(scenario);

  const login = `POST ${scenario.sanctum.endpoints.login}` as const;
  const identity = `GET ${scenario.sanctum.endpoints.user}` as const;

  it('names its fields for people and password managers', async () => {
    const { wrapper, email, password } = await mountForm();

    expect(accessibleName(email)).toMatch(/^Email/);
    expect(email.attributes('autocomplete')).toBe('username');
    expect(accessibleName(password)).toMatch(/^Password/);
    expect(password.attributes('autocomplete')).toBe('current-password');

    // The reveal button is a toggle, named for what it does
    const reveal = wrapper
      .findAll('button')
      .find((button) => accessibleName(button) === 'Show password');
    expect(reveal?.attributes('aria-pressed')).toBe('false');
    await reveal!.trigger('click');
    expect(reveal!.attributes('aria-pressed')).toBe('true');
    expect(password.attributes('type')).toBe('text');

    expect(await checkA11y()).toHaveNoViolations();
  });

  it('shows an empty field as an error on the field and focuses it', async () => {
    const { email, submit } = await mountForm();

    // A click on the submit button submits (also in happy-dom), which the
    // test of a second click while loading relies on
    await submit.trigger('click');
    await flushPromises();

    expectFocused(email);
    expect(email.attributes('aria-invalid')).toBe('true');
    expect(description(email)).not.toBe('');
    expect(requests(login)).toEqual([]);
  });

  it('shows the API error in the alert, in its language, not on the fields', async () => {
    fortify({ [login]: refuseWith(scenario.loginRefused) });
    const { wrapper, email, password, submit, signIn } = await mountForm();

    await signIn();

    const alert = wrapper.get('[role="alert"]');
    const [message] = (
      scenario.loginRefused.body as { errors: { email: string[] } }
    ).errors.email;
    expect(alert.text()).toContain(message);
    expect(alert.get('[lang]').attributes('lang')).toBe(scenario.errorLanguage);

    // An owner's decision: the server's errors go to the one alert. The
    // fields the browser found valid stay valid, and focus stays put.
    expect(email.attributes('aria-invalid')).toBeUndefined();
    expect(password.attributes('aria-invalid')).toBeUndefined();
    expectFocused(submit);
    expect(wrapper.emitted('error')).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(await checkA11y()).toHaveNoViolations();
  });

  it('says so when the browser was offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fortify({
      [login]: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    const { wrapper, signIn } = await mountForm();

    await signIn();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'You are offline. Check your connection and try again.',
    );
    vi.restoreAllMocks();
  });

  it('refreshes the identity, then goes where the sign-in was headed', async () => {
    fortify({
      [login]: () => ({}),
      [identity]: () => ({ data: scenario.user() }),
    });
    const { wrapper, signIn } = await mountForm(
      {},
      '/login?redirect=%2Fcourses%2F1',
    );

    await signIn();

    expect(requests(login)).toEqual([
      { email: 'ada@example.com', password: 'secret' },
    ]);
    expect(wrapper.emitted('success')).toHaveLength(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/courses/1');

    // The identity first: the page it goes to needs the user
    const identityCall = client.mock.calls.findIndex(
      ([url]) => url === scenario.sanctum.endpoints.user,
    );
    expect(client.mock.invocationCallOrder[identityCall]).toBeLessThan(
      navigate.mock.invocationCallOrder[0]!,
    );
  });

  it('goes to the app’s onLogin without a requested route', async () => {
    fortify({
      [login]: () => ({}),
      [identity]: () => ({ data: scenario.user() }),
    });
    const { signIn } = await mountForm({ remember: true });

    await signIn();

    expect(requests(login)).toEqual([
      { email: 'ada@example.com', password: 'secret', remember: true },
    ]);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      scenario.sanctum.redirect.onLogin,
    );
  });

  it('sends a second factor to the challenge, carrying the redirect, without reading the identity', async () => {
    fortify({ [login]: () => ({ two_factor: true }) });
    const { wrapper, signIn } = await mountForm(
      {},
      '/login?redirect=%2Fcourses%2F1',
    );

    await signIn();

    expect(wrapper.emitted('twoFactor')).toHaveLength(1);
    expect(wrapper.emitted('success')).toBeUndefined();
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      path: '/two-factor-authentication',
      query: { redirect: '/courses/1' },
    });
    // The session is not usable before the second factor
    expect(requests(identity)).toEqual([]);
  });

  it('is busy while the API answers, and a second click sends nothing', async () => {
    const answer = pending({});
    fortify({ [login]: answer.handler, [identity]: refuse(500) });
    const { wrapper, submit, signIn } = await mountForm();

    await signIn();

    expect(submit.attributes('aria-busy')).toBe('true');
    expect(submit.attributes('aria-disabled')).toBe('true');
    // Still focusable, so focus is not lost while it loads
    expect(submit.attributes('disabled')).toBeUndefined();

    await submit.trigger('click');
    await flushPromises();
    expect(requests(login)).toHaveLength(1);

    answer.fail(fetchError(500, {}));
    await flushPromises();

    expect(submit.attributes('aria-busy')).toBeUndefined();
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'Something went wrong. Please try again later.',
    );
  });
});
