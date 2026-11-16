import { describe, it, expect } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { useMfaSetupReminder, useNuxtApp, useRouter } from '#imports';
import mfaSetupMiddleware from '../../auth/app/middleware/mfa-setup.global';
import { fetchError } from '../fetch';
import {
  client,
  fortify,
  navigate,
  refuse,
  requests,
  signIn,
  useScenario,
} from './fortify';
import { academy, auditor } from './scenarios';

mockNuxtImport('useSanctumClient', () => () => client);
mockNuxtImport(
  'navigateTo',
  () =>
    (...args: unknown[]) =>
      navigate(...args),
);

/** Runs the global middleware for a navigation to `path` */
function navigateToPath(path: string) {
  const to = useRouter().resolve(path);
  return mfaSetupMiddleware(to, useRouter().currentRoute.value);
}

const toSetup = (redirect: string) => ({
  path: '/mfa-setup',
  query: { redirect },
});

/**
 * The `mfa-setup` middleware: the setup page stands between the user and
 * the app while MFA is required, and once after a sign-in without it.
 */
describe('mfa-setup middleware (Academy)', () => {
  useScenario(academy);

  it('lets a guest through', async () => {
    await navigateToPath('/courses/1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a user who must set up MFA to the setup page, on every navigation', async () => {
    signIn(academy.user({ mfa_enabled: false, mfa_required: true }));

    await navigateToPath('/courses/1?tab=2');
    await navigateToPath('/profile');

    expect(navigate.mock.calls).toEqual([
      [toSetup('/courses/1?tab=2')],
      [toSetup('/profile')],
    ]);
  });

  it('never sends an exempted account, whatever its role requires', async () => {
    signIn(
      academy.user({
        mfa_enabled: false,
        mfa_required: true,
        mfa_exempt: true,
      }),
    );
    await navigateToPath('/courses/1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the setup page itself alone', async () => {
    signIn(academy.user({ mfa_enabled: false, mfa_required: true }));
    await navigateToPath('/mfa-setup');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reminds once after a sign-in without MFA, for that account only', async () => {
    signIn(academy.user({ mfa_enabled: false }));
    useMfaSetupReminder().remindMfaSetup();

    await navigateToPath('/dashboard');
    expect(navigate).toHaveBeenCalledExactlyOnceWith(toSetup('/dashboard'));

    // Another account signs in on this tab: no reminder of the first's
    navigate.mockClear();
    signIn(academy.user({ email: 'grace@example.com', mfa_enabled: false }));
    await navigateToPath('/dashboard');
    expect(navigate).not.toHaveBeenCalled();

    // Skipped: not again
    signIn(academy.user({ mfa_enabled: false }));
    useMfaSetupReminder().dismissMfaSetup();
    await navigateToPath('/dashboard');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves a user with MFA alone', async () => {
    signIn(academy.user({ mfa_enabled: true, mfa_required: true }));
    useMfaSetupReminder().remindMfaSetup();
    await navigateToPath('/dashboard');
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('mfa-setup middleware (Auditor)', () => {
  useScenario(auditor);

  it('stays off for an API whose user payload has no MFA flags', async () => {
    signIn(auditor.user());
    useMfaSetupReminder().remindMfaSetup();
    await navigateToPath('/audits');
    expect(navigate).not.toHaveBeenCalled();
  });
});

/**
 * The 403 plugin: an API that starts requiring MFA mid-session answers 403
 * with a code; the layer re-reads the user and goes to the setup page.
 */
describe('mfa-setup-required plugin (Academy)', () => {
  useScenario(academy);

  const identity = `GET ${academy.sanctum.endpoints.user}` as const;
  const required = academy.user({ mfa_enabled: false, mfa_required: true });

  /** What nuxt-auth-sanctum's client reports for a refused request */
  async function refused(status: number, body: unknown) {
    await useNuxtApp().callHook('sanctum:error:response', {
      response: { status, _data: body },
    } as never);
    await flushPromises();
  }

  /** The Academy's JSON:API answer to a session without the MFA it needs */
  const jsonApi = (code: string) => ({
    errors: [{ status: '403', title: 'Forbidden', code }],
  });

  it('re-reads the user and goes to the setup page, back to where they were', async () => {
    signIn(academy.user({ mfa_enabled: false }));
    fortify({ [identity]: () => ({ data: required }) });
    // A light page: the navigation loads the page with all it imports, and
    // /form's took over five seconds in a busy full run and timed out
    await useRouter().push('/accessibility?step=2');

    await refused(403, jsonApi('mfa_setup_required'));

    expect(requests(identity)).toHaveLength(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(
      toSetup('/accessibility?step=2'),
    );
  });

  it('reads the code of a plain body, for the back office', async () => {
    fortify({ [identity]: () => ({ data: required }) });
    await refused(403, { code: 'backoffice_mfa_required' });
    expect(navigate).toHaveBeenCalledExactlyOnceWith(toSetup('/'));
  });

  it('goes to the setup page when the user cannot be re-read', async () => {
    fortify({ [identity]: refuse(500) });
    await refused(403, jsonApi('mfa_setup_required'));
    expect(navigate).toHaveBeenCalledExactlyOnceWith(toSetup('/'));
  });

  it.each([
    ['another 403', 403, jsonApi('forbidden')],
    ['a 403 without a code', 403, { message: 'This action is unauthorized.' }],
    ['the code on another status', 401, jsonApi('mfa_setup_required')],
  ])('ignores %s', async (_, status, body) => {
    await refused(status, body);
    expect(navigate).not.toHaveBeenCalled();
    expect(requests(identity)).toEqual([]);
  });

  it('stays on the setup page', async () => {
    signIn(required);
    await useRouter().push('/mfa-setup');
    navigate.mockClear();

    await refused(403, jsonApi('mfa_setup_required'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not go round when re-reading the user is refused the same way', async () => {
    fortify({
      [identity]: async () => {
        // The client reports this refusal through the same hook
        await refused(403, jsonApi('mfa_setup_required'));
        throw fetchError(403, jsonApi('mfa_setup_required'));
      },
    });

    await refused(403, jsonApi('mfa_setup_required'));

    expect(requests(identity)).toHaveLength(1);
    expect(navigate).toHaveBeenCalledOnce();
  });
});
