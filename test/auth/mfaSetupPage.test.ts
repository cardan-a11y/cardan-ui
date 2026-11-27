import type { RouteLocationNormalized } from 'vue-router';
import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { useMfaSetupReminder, useRouter } from '#imports';
import MfaSetupPage from '../../auth/app/pages/mfa-setup.vue';
import mfaSetupMiddleware from '../../auth/app/middleware/mfa-setup.global';
import { addRoutes } from '../dom';
import {
  RECOVERY_CODES,
  buttonNamed,
  fortify,
  navigate,
  pending,
  refuse,
  requests,
  signIn,
  twoFactorApi,
  useScenario,
  type Handler,
} from './fortify';
import { academy } from './scenarios';

mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

addRoutes('/dashboard');

const identity = `GET ${academy.sanctum.endpoints.user}` as const;
const confirm = 'POST /api/user/confirmed-two-factor-authentication';

/**
 * The layer's /mfa-setup, walked to the recovery codes, on an API that reports
 * MFA on once the code is confirmed. `identityAfter` answers the identity
 * requests after the confirmation, in turn (a handler answers itself); the
 * last one repeats.
 */
async function mountWalked(
  identityAfter: Array<'ok' | 'fail' | Handler> = ['ok'],
  { required = true } = {},
) {
  let confirmed = false;
  let after = 0;

  signIn(academy.user({ mfa_enabled: false, mfa_required: required }));
  fortify(
    twoFactorApi(
      academy,
      {},
      {
        [confirm]: () => {
          confirmed = true;
          return {};
        },
        [identity]: (body) => {
          if (confirmed) {
            const answer =
              identityAfter[Math.min(after++, identityAfter.length - 1)];
            if (answer === 'fail') return refuse(500)(body);
            if (typeof answer === 'function') return answer(body);
          }
          return {
            data: academy.user({
              mfa_required: required,
              mfa_enabled: confirmed,
            }),
          };
        },
      },
    ),
  );

  const wrapper = await mountSuspended(MfaSetupPage, {
    route: '/mfa-setup',
    attachTo: document.body,
  });
  const button = (name: string) => buttonNamed(wrapper, name);

  await button('Enable MFA').trigger('click');
  await flushPromises();
  await button('Continue').trigger('click');
  await flushPromises();
  await wrapper.get('input[name="code"]').setValue('123456');
  const beforeConfirm = requests(identity).length;
  await button('Confirm').trigger('click');
  await flushPromises();

  return {
    wrapper,
    button,
    /** Identity requests since the code was confirmed */
    identityRequests: () => requests(identity).length - beforeConfirm,
  };
}

/** Runs the layer's global middleware for a navigation to `path` */
function middlewareFor(path: string) {
  const to = useRouter().resolve(path) as RouteLocationNormalized;
  return mfaSetupMiddleware(to, useRouter().currentRoute.value);
}

describe('/mfa-setup page, MFA required (Academy)', () => {
  useScenario(academy);

  it('refreshes the identity once after the code, and leaves after the recovery codes', async () => {
    const { wrapper, button, identityRequests } = await mountWalked();

    expect(identityRequests()).toBe(1);
    expect(useMfaSetupReminder().mfaEnabled.value).toBe(true);
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(
      RECOVERY_CODES,
    );

    await button("I've stored my recovery codes").trigger('click');
    await flushPromises();

    expect(identityRequests()).toBe(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dashboard');

    // The app's next navigation is not sent back to the setup
    await middlewareFor('/dashboard');
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('still shows the codes when the refresh fails, and reads the identity again on finish', async () => {
    const { wrapper, button, identityRequests } = await mountWalked([
      'fail',
      'ok',
    ]);

    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(
      RECOVERY_CODES,
    );
    expect(useMfaSetupReminder().mfaEnabled.value).toBe(false);

    await button("I've stored my recovery codes").trigger('click');
    await flushPromises();

    expect(identityRequests()).toBe(2);
    expect(useMfaSetupReminder().mfaEnabled.value).toBe(true);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });

  it('stays, with the error in the alert, when the identity cannot be read on finish either', async () => {
    const { wrapper, button } = await mountWalked(['fail']);

    await button("I've stored my recovery codes").trigger('click');
    await flushPromises();

    expect(navigate).not.toHaveBeenCalled();
    const alerts = wrapper
      .findAll('[role="alert"]')
      .map((alert) => alert.text())
      .filter(Boolean);
    expect(alerts).toEqual(['Something went wrong. Please try again later.']);
    expect(
      button("I've stored my recovery codes").attributes('aria-busy'),
    ).toBeUndefined();
  });

  it('keeps the finish button busy while it reads the identity again', async () => {
    const retry = pending({
      data: academy.user({ mfa_required: true, mfa_enabled: true }),
    });
    const { button } = await mountWalked(['fail', retry.handler]);
    // The same element throughout: a loading button's name says it is loading
    const finish = button("I've stored my recovery codes");

    await finish.trigger('click');
    await flushPromises();
    expect(finish.attributes('aria-busy')).toBe('true');
    expect(navigate).not.toHaveBeenCalled();

    retry.answer();
    await flushPromises();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dashboard');
  });
});

describe('/mfa-setup page, MFA a reminder (Academy)', () => {
  useScenario(academy);

  it('leaves after the recovery codes without reading the identity again, even when it could not be read', async () => {
    const { button, identityRequests } = await mountWalked(['fail'], {
      required: false,
    });

    await button("I've stored my recovery codes").trigger('click');
    await flushPromises();

    expect(identityRequests()).toBe(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/dashboard');

    await middlewareFor('/dashboard');
    expect(navigate).toHaveBeenCalledOnce();
  });
});
